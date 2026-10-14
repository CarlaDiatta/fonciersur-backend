const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('[BDD] Connexion réussie à PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[BDD] Erreur de connexion PostgreSQL :', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};