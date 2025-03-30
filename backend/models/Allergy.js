class Allergy {
    static pool; // Database connection pool

    static init(pool) {
        this.pool = pool;
    }

    static async getAll() {
        const [rows] = await this.pool.query('SELECT * FROM allergies');
        return rows;
    }

    static async create(allergyData) {
        const [result] = await this.pool.query('INSERT INTO allergies SET ?', allergyData);
        return { ...allergyData, allergy_id: result.insertId };
    }

    // Additional ORM methods...
}

module.exports = Allergy;