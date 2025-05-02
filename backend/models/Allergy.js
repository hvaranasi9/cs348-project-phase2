class Allergy {
    static pool;

    static init(pool) {
        this.pool = pool;
    }

    static async getAll() {
        const [rows] = await this.pool.query(`
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
        return rows;
    }

    static async getById(allergyId) {
        const [rows] = await this.pool.query(
            'SELECT * FROM allergies WHERE allergy_id = ?', 
            [allergyId]
        );
        return rows[0];
    }

    static async create(allergyData) {
        const [result] = await this.pool.query(
            'INSERT INTO allergies SET ?', 
            allergyData
        );
        return { ...allergyData, allergy_id: result.insertId };
    }

    static async update(allergyId, allergyData) {
        const validFields = ['name', 'severity', 'description'];
        const updateData = {};
        
        validFields.forEach(field => {
            if (allergyData[field] !== undefined) {
                updateData[field] = allergyData[field];
            }
        });

        const [result] = await this.pool.query(
            'UPDATE allergies SET ? WHERE allergy_id = ?',
            [updateData, allergyId]
        );
        
        if (result.affectedRows === 0) {
            throw new Error('Allergy not found');
        }
        return this.getById(allergyId);
    }

    // static async delete(allergyId) {
    //     const conn = await this.pool.getConnection();
    //     try {
    //         await conn.beginTransaction();
            
    //         await conn.query(
    //             'DELETE FROM user_allergies WHERE allergy_id = ?', 
    //             [allergyId]
    //         );
            
    //         const [result] = await conn.query(
    //             'DELETE FROM allergies WHERE allergy_id = ?',
    //             [allergyId]
    //         );
            
    //         if (result.affectedRows === 0) {
    //             throw new Error('Allergy not found');
    //         }
            
    //         await conn.commit();
    //         return true;
    //     } catch (err) {
    //         await conn.rollback();
    //         throw err;
    //     } finally {
    //         conn.release();
    //     }
    // }

    // In Allergy.js (critical fix)

    static async delete(allergyId) {
        const conn = await this.pool.getConnection();
        try {
            await conn.beginTransaction();
            
            // Let CASCADE handle the user_allergies deletion
            const [result] = await conn.query(
                'DELETE FROM allergies WHERE allergy_id = ?',
                [allergyId]
            );
            
            if (result.affectedRows === 0) {
                throw new Error('Allergy not found');
            }
            
            await conn.commit();
            return true;
        } catch (err) {
            await conn.rollback();
            console.error('DELETE ALLERGY ERROR:', err);
            throw err; // This will trigger the 500 error handler in Express
        } finally {
            conn.release();
        }
    }

    static async getUsersWithAllergy(allergyId) {
        const [rows] = await this.pool.query(`
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
        `, [allergyId]);
        return rows;
    }
}

module.exports = Allergy;