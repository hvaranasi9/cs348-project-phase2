class User {
    static pool;
    
    static init(pool) {
        this.pool = pool;
    }
    
    static async getAll() {
        const [rows] = await this.pool.query(`
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
        return rows;
    }
    
    static async getById(userId) {
        const [rows] = await this.pool.query(
            'SELECT * FROM users WHERE user_id = ?',
            [userId]
        );
        return rows[0];
    }
    
    static async create(userData) {
        const [result] = await this.pool.query(
            'INSERT INTO users SET ?',
            userData
        );
        return { ...userData, user_id: result.insertId };
    }
    
    static async update(userId, userData) {
        const validFields = ['name', 'age', 'email'];
        const updateData = {};
       
        validFields.forEach(field => {
            if (userData[field] !== undefined) {
                updateData[field] = userData[field];
            }
        });
        
        const [result] = await this.pool.query(
            'UPDATE users SET ? WHERE user_id = ?',
            [updateData, userId]
        );
       
        if (result.affectedRows === 0) {
            throw new Error('User not found');
        }
        
        return this.getById(userId);
    }
    
    static async delete(userId) {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();
            
            // The ON DELETE CASCADE constraint will handle deletion in the user_allergies table
            const [result] = await conn.query(
                'DELETE FROM users WHERE user_id = ?',
                [userId]
            );
           
            if (result.affectedRows === 0) {
                await conn.rollback();
                throw new Error('User not found');
            }
           
            await conn.commit();
            return true;
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }
    }
    
    static async getUserAllergies(userId) {
        const [rows] = await this.pool.query(`
            SELECT
                a.allergy_id,
                a.name,
                a.severity,
                a.description,
                ua.notes,
                ua.diagnosed_date
            FROM user_allergies ua
            JOIN allergies a ON ua.allergy_id = a.allergy_id
            WHERE ua.user_id = ?
        `, [userId]);
        return rows;
    }
    
    static async addAllergy(userId, allergyId, allergyData = {}) {
        try {
            const [result] = await this.pool.query(
                'INSERT INTO user_allergies (user_id, allergy_id, notes, diagnosed_date) VALUES (?, ?, ?, ?)',
                [
                    userId,
                    allergyId,
                    allergyData.notes || null,
                    allergyData.diagnosed_date || null
                ]
            );
            
            return {
                user_allergy_id: result.insertId,
                user_id: parseInt(userId),
                allergy_id: parseInt(allergyId),
                ...allergyData
            };
        } catch (err) {
            // Handle duplicate entry error more gracefully
            if (err.code === 'ER_DUP_ENTRY') {
                throw new Error('This user already has this allergy assigned');
            }
            throw err;
        }
    }
}

module.exports = User;