const db = require('../config/db');

class User {
  static async findByEmail(email) {
    const res = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return res.rows[0];
  }

  static async create({ nom, prenom, email, password_hash, role }) {
    const query = `
      INSERT INTO users (nom, prenom, email, password_hash, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nom, prenom, email, role, created_at;
    `;
    const res = await db.query(query, [nom, prenom, email, password_hash, role]);
    return res.rows[0];
  }
}

module.exports = User;