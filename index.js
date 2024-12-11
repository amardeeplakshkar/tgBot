const { Telegraf, Markup } = require('telegraf');
require('dotenv').config();
const { initDb, savePayment } = require('./db');

initDb();

const BOT_TOKEN = process.env.BOT_TOKEN;
const PROVIDER_TOKEN = process.env.PROVIDER_TOKEN;

// Initialize the bot
const bot = new Telegraf(BOT_TOKEN);

// Candidates for voting
const candidates = ['Tomarket', 'Duckchain', 'Cats'];

// Function to create the voting menu
const votingKeyboard = () => {
  return Markup.inlineKeyboard(
    candidates.map((candidate) => [
      Markup.button.callback(`Vote for ${candidate}`, `vote_${candidate}`)
    ])
  );
};

// Function to create the "Pay" button for inline payments
const paymentKeyboard = () => {
  return Markup.inlineKeyboard([
    Markup.button.pay('Pay 1 XTR to Vote')
  ]);
};

// Command: /start
bot.start((ctx) => {
  ctx.reply(
    'Welcome! Vote for your favorite candidate by clicking the button below.',
    votingKeyboard()
  );
});

// Voting action
candidates.forEach((candidate) => {
  bot.action(`vote_${candidate}`, async (ctx) => {
    try {
      console.log(`${ctx.from.username} clicked to vote for ${candidate}`);
      const prices = [{ label: 'XTR', amount: 1 }]; 

      await ctx.replyWithInvoice({
        title: 'Vote Payment',
        description: `Vote for ${candidate} in exchange for 1 Star.`,
        payload: `vote_${candidate}_payload`,
        provider_token: PROVIDER_TOKEN,
        currency: 'XTR',
        prices,
        reply_markup: paymentKeyboard()
      });

      // Temporarily log the user's intent to vote for this candidate
      console.log(`User ${ctx.from.id} initiated payment for voting ${candidate}`);
    } catch (error) {
      console.error('Vote Payment Error:', error);
      await ctx.reply('Failed to initiate voting payment. Please try again.');
    }
  });
});

// Pre-checkout query handling
bot.on('pre_checkout_query', async (ctx) => {
  try {
    await ctx.answerPreCheckoutQuery(true); // Approve payment
  } catch (error) {
    console.error('Pre-checkout Error:', error);
  }
});

// Handle successful payment
bot.on('successful_payment', (ctx) => {
  const { id: userId } = ctx.from;
  const paymentId = ctx.message.successful_payment.provider_payment_charge_id;
  const { total_amount: amount, currency } = ctx.message.successful_payment;
  const payload = ctx.message.successful_payment.invoice_payload;

  // Extract candidate from the payload
  const candidate = payload.replace('vote_', '').replace('_payload', '');

  // Save the payment and vote
  savePayment(userId, paymentId, amount, currency, candidate);

  ctx.reply(
    `✅ Payment received! Your vote for ${candidate} has been successfully recorded.`
  );

  console.log(`Vote recorded: ${userId} -> ${candidate}`);
});

// Command: /results (Admin Only)
bot.command('results', (ctx) => {
  if (ctx.from.id !== 6102684114) {
    return ctx.reply('You are not authorized to view results.');
  }

  // Tally the votes
  const tally = candidates.reduce((acc, candidate) => {
    acc[candidate] = 0; // Initialize vote count
    return acc;
  }, {});

  // Retrieve all votes and count them
  const db = new sqlite3.Database('./database.db');
  db.all('SELECT candidate FROM payments', (err, rows) => {
    if (err) {
      console.error('Error fetching votes:', err);
      return;
    }

    // Count the votes for each candidate
    rows.forEach((row) => {
      if (tally[row.candidate] !== undefined) {
        tally[row.candidate]++;
      }
    });

    let resultsMessage = '📊 Voting Results:\n';
    candidates.forEach((candidate) => {
      resultsMessage += `${candidate}: ${tally[candidate] || 0} votes\n`;
    });

    ctx.reply(resultsMessage);
  });

  db.close();
});

// Start the bot
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
