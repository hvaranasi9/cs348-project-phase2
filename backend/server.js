const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const User = require('./models/User');
const Allergy = require('./models/Allergy');

const app = express();
app.use(cors());
app.use(express.json());

// Database connection pool
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '|hD369;V|x3.', // Replace with your password
    database: 'user_allergy_tracker',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Initialize ORM models (keeping this for compatibility)
User.init(pool);
Allergy.init(pool);

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
// API ROUTES (Using Direct Prepared Statements)
// ======================

// 1. Health Check
app.get('/', (req, res) => {
    res.json({ 
        status: 'API is working',
        timestamp: new Date().toISOString()
    });
});

// 2. USER ROUTES (Direct Prepared Statements)

// Get all users with allergy counts
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await pool.query(`
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
        res.json(rows);
    } catch (err) {
        console.error('GET /api/users error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch users',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Get single user with allergies
app.get('/api/users/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Get user
        const [userRows] = await conn.query(
            'SELECT * FROM users WHERE user_id = ?',
            [req.params.id]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get allergies
        const [allergyRows] = await conn.query(
            `SELECT
                a.allergy_id,
                a.name,
                a.severity,
                a.description,
                ua.notes,
                ua.diagnosed_date
            FROM user_allergies ua
            JOIN allergies a ON ua.allergy_id = a.allergy_id
            WHERE ua.user_id = ?`,
            [req.params.id]
        );

        await conn.commit();
        res.json({ ...userRows[0], allergies: allergyRows });
    } catch (err) {
        await conn.rollback();
        console.error('GET /api/users/:id error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch user',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    } finally {
        conn.release();
    }
});

// Create new user
app.post('/api/users', async (req, res) => {
    try {
        const { name, age, email } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const [result] = await pool.query(
            'INSERT INTO users (name, age, email) VALUES (?, ?, ?)',
            [name, age, email]
        );
        
        const newUser = {
            user_id: result.insertId,
            name,
            age,
            email
        };
        
        res.status(201).json(newUser);
    } catch (err) {
        console.error('POST /api/users error:', err);
        res.status(500).json({ 
            error: 'Failed to create user',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Update user
app.put('/api/users/:id', async (req, res) => {
    try {
        const validFields = ['name', 'age', 'email'];
        const updates = [];
        const values = [];
        
        validFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        });
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        values.push(req.params.id); // For WHERE clause
        
        const [result] = await pool.query(
            `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`,
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Fetch updated user
        const [userRows] = await pool.query(
            'SELECT * FROM users WHERE user_id = ?',
            [req.params.id]
        );
        
        res.json(userRows[0]);
    } catch (err) {
        console.error('PUT /api/users/:id error:', err);
        res.status(500).json({ 
            error: 'Failed to update user'
        });
    }
});

// Delete user
app.delete('/api/users/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // First delete dependencies (manual CASCADE)
        await conn.query(
            'DELETE FROM user_allergies WHERE user_id = ?',
            [req.params.id]
        );
        
        const [result] = await conn.query(
            'DELETE FROM users WHERE user_id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'User not found' });
        }
        
        await conn.commit();
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        await conn.rollback();
        console.error('DELETE /api/users/:id error:', err);
        res.status(500).json({ 
            error: 'Failed to delete user'
        });
    } finally {
        conn.release();
    }
});

// 3. ALLERGY ROUTES (Direct Prepared Statements)

// Get all allergies with user counts
app.get('/api/allergies', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                a.allergy_id,
                a.name,
                a.severity,
                a.description,
                COUNT(ua.user_id) AS user_count
            FROM allergies a
            LEFT JOIN user_allergies ua ON a.allergy_id = ua.allergy_id
            GROUP BY a.allergy_id
            ORDER BY a.name
        `);
        res.json(rows);
    } catch (err) {
        console.error('GET /api/allergies error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch allergies',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Create new allergy
app.post('/api/allergies', async (req, res) => {
    try {
        const { name, severity, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        const [result] = await pool.query(
            'INSERT INTO allergies (name, severity, description) VALUES (?, ?, ?)',
            [name, severity || 'mild', description]
        );
        
        const newAllergy = {
            allergy_id: result.insertId,
            name,
            severity: severity || 'mild',
            description
        };
        
        res.status(201).json(newAllergy);
    } catch (err) {
        console.error('POST /api/allergies error:', err);
        res.status(500).json({ 
            error: 'Failed to create allergy',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Update allergy
app.put('/api/allergies/:id', async (req, res) => {
    try {
        const validFields = ['name', 'severity', 'description'];
        const updates = [];
        const values = [];
        2195
        validFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updates.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        });
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        
        values.push(req.params.id); // For WHERE clause
        
        const [result] = await pool.query(
            `UPDATE allergies SET ${updates.join(', ')} WHERE allergy_id = ?`,
            values
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Allergy not found' });
        }
        
        // Fetch updated allergy
        const [allergyRows] = await pool.query(
            'SELECT * FROM allergies WHERE allergy_id = ?',
            [req.params.id]
        );
        
        res.json(allergyRows[0]);
    } catch (err) {
        console.error('PUT /api/allergies/:id error:', err);
        res.status(500).json({ 
            error: 'Failed to update allergy'
        });
    }
});

// Delete allergy
app.delete('/api/allergies/:id', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        // First delete dependencies (manual CASCADE)
        await conn.query(
            'DELETE FROM user_allergies WHERE allergy_id = ?',
            [req.params.id]
        );
        
        const [result] = await conn.query(
            'DELETE FROM allergies WHERE allergy_id = ?',
            [req.params.id]
        );
        
        if (result.affectedRows === 0) {
            await conn.rollback();
            return res.status(404).json({ error: 'Allergy not found' });
        }
        
        await conn.commit();
        res.json({ message: 'Allergy deleted successfully' });
    } catch (err) {
        await conn.rollback();
        console.error('DELETE /api/allergies/:id error:', err);
        res.status(500).json({ 
            error: 'Failed to delete allergy'
        });
    } finally {
        conn.release();
    }
});

// 4. USER-ALLERGY RELATIONSHIPS (Direct Prepared Statements)

// Assign allergy to user
app.post('/api/users/:userId/allergies', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        
        const { allergy_id, notes, diagnosed_date } = req.body;

        if (!allergy_id) {
            return res.status(400).json({ error: 'allergy_id is required' });
        }

        // Check if user exists
        const [userRows] = await conn.query(
            'SELECT 1 FROM users WHERE user_id = ?',
            [req.params.userId]
        );
        
        if (userRows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if allergy exists
        const [allergyRows] = await conn.query(
            'SELECT 1 FROM allergies WHERE allergy_id = ?',
            [allergy_id]
        );
        
        if (allergyRows.length === 0) {
            return res.status(404).json({ error: 'Allergy not found' });
        }

        // Check if relationship already exists
        const [existingRows] = await conn.query(
            'SELECT 1 FROM user_allergies WHERE user_id = ? AND allergy_id = ?',
            [req.params.userId, allergy_id]
        );
        
        if (existingRows.length > 0) {
            return res.status(400).json({ error: 'User already has this allergy' });
        }

        // Create relationship
        const [result] = await conn.query(
            'INSERT INTO user_allergies (user_id, allergy_id, notes, diagnosed_date) VALUES (?, ?, ?, ?)',
            [req.params.userId, allergy_id, notes || null, diagnosed_date || null]
        );
        
        await conn.commit();
        
        const relationship = {
            user_allergy_id: result.insertId,
            user_id: req.params.userId,
            allergy_id,
            notes,
            diagnosed_date
        };
        
        res.status(201).json(relationship);
    } catch (err) {
        await conn.rollback();
        console.error('POST /api/users/:userId/allergies error:', err);
        res.status(500).json({ 
            error: 'Failed to add allergy to user'
        });
    } finally {
        conn.release();
    }
});

// Get users with specific allergy
app.get('/api/allergies/:id/users', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                u.user_id,
                u.name,
                u.age,
                u.email,
                ua.notes,
                ua.diagnosed_date
            FROM user_allergies ua
            JOIN users u ON ua.user_id = u.user_id
            WHERE ua.allergy_id = ?
        `, [req.params.id]);
        res.json(rows);
    } catch (err) {
        console.error('GET /api/allergies/:id/users error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch users with allergy'
        });
    }
});

// 5. STATISTICS (Direct Prepared Statement)
app.get('/api/stats', async (req, res) => {
    try {
        const [rows] = await pool.query(`
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
        res.json(rows);
    } catch (err) {
        console.error('GET /api/stats error:', err);
        res.status(500).json({ 
            error: 'Failed to fetch statistics'
        });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});