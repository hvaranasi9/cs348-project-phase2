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

// Test database connection
pool.getConnection()
    .then(conn => {
        console.log('✅ Database connected');
        conn.release();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err);
    });

// ======================
// ROUTES (70% prepared statements)
// ======================

// 1. HEALTH CHECK
app.get('/', (req, res) => {
    res.json({ 
        status: 'API is working', 
        db_connection: pool.pool.config.connectionConfig.database,
        timestamp: new Date() 
    });
});

// 2. USER ROUTES

// Get all users with allergy counts (Prepared)
app.get('/api/users', async (req, res) => {
    try {
        const [users] = await pool.execute(`
            SELECT 
                u.user_id, 
                u.name, 
                u.age,
                u.email,
                COUNT(ua.user_allergy_id) AS allergy_count
            FROM users u
            LEFT JOIN user_allergies ua ON u.user_id = ua.user_id
            GROUP BY u.user_id
            ORDER BY u.name
        `);
        res.json(users);
    } catch (err) {
        console.error('🚨 GET /api/users error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get single user with allergies (Prepared)
app.get('/api/users/:id', async (req, res) => {
    try {
        const [user] = await pool.execute(
            'SELECT * FROM users WHERE user_id = ?', 
            [req.params.id]
        );
        
        if (!user[0]) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [allergies] = await pool.execute(
            `SELECT 
                a.allergy_id,
                a.name,
                a.severity,
                ua.notes,
                ua.diagnosed_date
             FROM user_allergies ua
             JOIN allergies a ON ua.allergy_id = a.allergy_id
             WHERE ua.user_id = ?`,
            [req.params.id]
        );

        res.json({ ...user[0], allergies });
    } catch (err) {
        console.error('🚨 GET /api/users/:id error:', err);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create user (Prepared)
app.post('/api/users', async (req, res) => {
    try {
        const { name, age, email } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const [result] = await pool.execute(
            'INSERT INTO users (name, age, email) VALUES (?, ?, ?)',
            [name, age || null, email]
        );

        res.status(201).json({
            user_id: result.insertId,
            name,
            age,
            email
        });
    } catch (err) {
        console.error('🚨 POST /api/users error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// 3. ALLERGY ROUTES

// Get all allergies (Prepared)
app.get('/api/allergies', async (req, res) => {
    try {
        const [allergies] = await pool.execute(`
            SELECT 
                allergy_id,
                name,
                severity,
                description
            FROM allergies
            ORDER BY name
        `);
        res.json(allergies);
    } catch (err) {
        console.error('🚨 GET /api/allergies error:', err);
        res.status(500).json({ error: 'Failed to fetch allergies' });
    }
});

// Add allergy to user (Prepared)
app.post('/api/users/:userId/allergies', async (req, res) => {
    try {
        const { allergy_id, notes, diagnosed_date } = req.body;

        // Validate required fields
        if (!allergy_id) {
            return res.status(400).json({ error: 'allergy_id is required' });
        }

        // Check if relationship exists
        const [existing] = await pool.execute(
            `SELECT 1 FROM user_allergies 
             WHERE user_id = ? AND allergy_id = ?`,
            [req.params.userId, allergy_id]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'Allergy already assigned to user' });
        }

        const [result] = await pool.execute(
            `INSERT INTO user_allergies 
             (user_id, allergy_id, notes, diagnosed_date)
             VALUES (?, ?, ?, ?)`,
            [req.params.userId, allergy_id, notes || null, diagnosed_date || null]
        );

        res.status(201).json({
            user_allergy_id: result.insertId,
            user_id: req.params.userId,
            allergy_id,
            notes,
            diagnosed_date
        });
    } catch (err) {
        console.error('🚨 POST /api/users/:userId/allergies error:', err);
        res.status(500).json({ error: 'Failed to add allergy to user' });
    }
});

// 4. STATISTICS (Prepared)

// Get allergy statistics
app.get('/api/stats', async (req, res) => {
    try {
        const [stats] = await pool.execute(`
            SELECT 
                a.allergy_id,
                a.name,
                a.severity,
                COUNT(ua.user_id) AS affected_users,
                AVG(u.age) AS average_age_affected
            FROM allergies a
            LEFT JOIN user_allergies ua ON a.allergy_id = ua.allergy_id
            LEFT JOIN users u ON ua.user_id = u.user_id
            GROUP BY a.allergy_id
            ORDER BY affected_users DESC
        `);
        res.json(stats);
    } catch (err) {
        console.error('🚨 GET /api/stats error:', err);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('🔥 Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = 3006;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});