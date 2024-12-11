const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Set the path to your SQLite database file
const DATABASE = path.join(__dirname, 'database.db');

// Function to initialize the database (create table if it doesn't exist)
function initDb() {
    const db = new sqlite3.Database(DATABASE, (err) => {
        if (err) {
            console.error('Error opening database:', err.message);
            return;
        }
        console.log('Connected to the SQLite database.');
    });

    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS payments (
            user_id INTEGER,
            payment_id TEXT,
            amount INTEGER,
            currency TEXT,
            candidate TEXT,
            PRIMARY KEY (user_id, payment_id)
        );
    `;

    db.run(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Table "payments" created or already exists.');
        }
    });

    db.close();
}

// Function to save payment and vote data to the database
function savePayment(userId, paymentId, amount, currency, candidate) {
    const db = new sqlite3.Database(DATABASE);

    const insertQuery = `
        INSERT INTO payments (user_id, payment_id, amount, currency, candidate)
        VALUES (?, ?, ?, ?, ?);
    `;

    db.run(insertQuery, [userId, paymentId, amount, currency, candidate], function(err) {
        if (err) {
            console.error('Error inserting payment:', err.message);
        } else {
            console.log(`Payment saved for user ${userId}: ${paymentId}`);
        }
    });

    db.close();
}

module.exports = { initDb, savePayment };
