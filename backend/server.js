const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '|hD369;V|x3.',
    database: 'user_allergy_tracker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test database connection immediately
pool.getConnection()
    .then(conn => {
        console.log('Database connected successfully!');
        conn.release();
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });

// Routes
app.get('/', (req, res) => {
    res.json({ status: 'API is working', timestamp: new Date() });
});

// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get all allergies
app.get('/api/allergies', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM allergies');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Add new user
app.post('/api/users', async (req, res) => {
    try {
        const { name, age, email } = req.body;
        const [result] = await pool.query(
            'INSERT INTO users (name, age, email) VALUES (?, ?, ?)',
            [name, age, email]
        );
        res.status(201).json({ id: result.insertId, name, age, email });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: 'Invalid data' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something broke!' });
});

const PORT = 3006;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});