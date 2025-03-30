class User {
    static pool; // Database connection pool

    static init(pool) {
        this.pool = pool;
    }

    static async getAll() {
        const [rows] = await this.pool.query('SELECT * FROM users');
        return rows;
    }

    static async getById(userId) {
        const [rows] = await this.pool.query('SELECT * FROM users WHERE user_id = ?', [userId]);
        return rows[0];
    }

    static async create(userData) {
        const [result] = await this.pool.query('INSERT INTO users SET ?', userData);
        return { ...userData, user_id: result.insertId };
    }

    // Additional ORM methods...
}

module.exports = User;