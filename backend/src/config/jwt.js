const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  secret: process.env.JWT_SECRET || 'fonciersur_secret_key_2026',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};