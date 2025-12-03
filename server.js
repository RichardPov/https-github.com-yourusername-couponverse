const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'couponverse-secret-key', // In production, use a secure random string
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hour
}));

// Auth Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.status(401).json({ error: "Unauthorized" });
    }
};

// --- API Routes ---

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    // Hardcoded credentials as requested
    if (username === 'Richard' && password === '080594') {
        req.session.user = { username: 'Richard', role: 'admin' };
        res.json({ message: "Login successful" });
    } else {
        res.status(401).json({ error: "Invalid credentials" });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: "Logged out" });
});

// Check Session
app.get('/api/me', (req, res) => {
    if (req.session.user) {
        res.json({ user: req.session.user });
    } else {
        res.status(401).json({ error: "Not logged in" });
    }
});

// Get Approved Coupons (Public)
app.get('/api/coupons', (req, res) => {
    const { category } = req.query;
    let sql = "SELECT * FROM coupons WHERE status = 'approved'";
    const params = [];

    if (category && category !== 'all') {
        sql += " AND category = ?";
        params.push(category);
    }

    sql += " ORDER BY created_at DESC";

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// Submit Coupon (Public)
app.post('/api/coupons', (req, res) => {
    const { store_name, description, code, category, discount_amount, expiry_date } = req.body;

    if (!store_name || !code || !description) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    const sql = `INSERT INTO coupons(store_name, description, code, category, discount_amount, expiry_date, status) VALUES(?, ?, ?, ?, ?, ?, 'pending')`;
    const params = [store_name, description, code, category, discount_amount, expiry_date];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID },
            "info": "Coupon submitted for approval"
        });
    });
});

// Subscribe to Newsletter
app.post('/api/subscribe', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: "Email is required" });
    }

    const sql = `INSERT INTO subscribers(email) VALUES(?)`;

    db.run(sql, [email], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: "Email already subscribed" });
            }
            return res.status(400).json({ "error": err.message });
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID }
        });
    });
});

// --- Admin Routes (Protected) ---

// Get All Coupons (Admin)
app.get('/api/admin/coupons', isAuthenticated, (req, res) => {
    const sql = "SELECT * FROM coupons ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// Add Coupon (Admin)
app.post('/api/admin/coupons', isAuthenticated, (req, res) => {
    const { store_name, description, code, category, discount_amount, expiry_date } = req.body;

    const sql = `INSERT INTO coupons(store_name, description, code, category, discount_amount, expiry_date, status) VALUES(?, ?, ?, ?, ?, ?, 'approved')`;
    const params = [store_name, description, code, category, discount_amount, expiry_date];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID }
        });
    });
});

// Update Coupon Status (Admin)
app.put('/api/admin/coupons/:id', isAuthenticated, (req, res) => {
    const { status } = req.body;
    const { id } = req.params;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
    }

    const sql = `UPDATE coupons SET status = ? WHERE id = ? `;

    db.run(sql, [status, id], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "changes": this.changes
        });
    });
});

// Delete Coupon (Admin)
app.delete('/api/admin/coupons/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const sql = `DELETE FROM coupons WHERE id = ? `;

    db.run(sql, [id], function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "changes": this.changes
        });
    });
});

// Get Subscribers (Admin)
app.get('/api/admin/subscribers', isAuthenticated, (req, res) => {
    const sql = "SELECT * FROM subscribers ORDER BY created_at DESC";
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} `);
});
