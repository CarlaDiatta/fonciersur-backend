const path = require('path');
const { Sequelize } = require('sequelize');

require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DB_PASSWORD?.trim()) {
  throw new Error(
    'DB_PASSWORD est absent ou vide. Copiez .env.example vers .env et configurez les accès PostgreSQL.'
  );
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'fonciersur',
  process.env.DB_USER || 'fonciersur_dev',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    logging: false,
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connexion à PostgreSQL (Sequelize) réussie.');
  } catch (error) {
    console.error('Impossible de se connecter à la base de données :', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };