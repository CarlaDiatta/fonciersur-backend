const db = require('../config/db');

class Validation {
  static async create({ parcelle_id, acteur_id, etape, decision, motif }) {
    const query = `
      INSERT INTO validations (parcelle_id, acteur_id, etape, decision, motif)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const res = await db.query(query, [parcelle_id, acteur_id, etape, decision, motif]);
    return res.rows[0];
  }

  static async findByParcelle(parcelle_id) {
    const res = await db.query('SELECT * FROM validations WHERE parcelle_id = $1 ORDER BY created_at DESC', [parcelle_id]);
    return res.rows;
  }
}

module.exports = Validation;