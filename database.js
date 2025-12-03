const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'couponverse.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Coupons Table
        db.run(`CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_name TEXT NOT NULL,
            description TEXT NOT NULL,
            code TEXT NOT NULL,
            category TEXT NOT NULL,
            discount_amount TEXT NOT NULL,
            expiry_date TEXT,
            status TEXT DEFAULT 'pending', -- pending, approved, rejected
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Subscribers Table
        db.run(`CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Seed some initial data if empty
        db.get("SELECT count(*) as count FROM coupons", (err, row) => {
            if (row.count === 0) {
                console.log("Seeding initial coupons...");
                const stmt = db.prepare("INSERT INTO coupons (store_name, description, code, category, discount_amount, status, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)");

                const seedData = [
                    ['Amazon', 'Save 50% on all Echo devices', 'SUMMER50', 'tech', '50% OFF', 'approved', '2025-12-31'],
                    ['Nike', '20% off your first order', 'NIKE20NEW', 'fashion', '20% OFF', 'approved', '2025-12-31'],
                    ['Spotify', '3 Months Free Premium', 'SPOTIFY3FREE', 'tech', '3 Months Free', 'approved', '2025-12-31'],
                    ['Uber Eats', 'Free delivery on orders over $20', 'EATS20', 'food', 'Free Delivery', 'approved', '2025-12-31'],
                    ['ASOS', '15% Student Discount', 'STUDENT15', 'fashion', '15% OFF', 'approved', '2025-12-31']
                ];

                seedData.forEach(coupon => {
                    stmt.run(coupon);
                });
                stmt.finalize();
            }
        });
    });
}

module.exports = db;
