const express = require('express');
const cors = require('cors');

const { connectDB, sequelize } = require('./config/db');
const routes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());

// Préfixe global /api conforme au cahier des charges
app.use('/api', routes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    await sequelize.sync({ alter: true });
    console.log('Modèles synchronisés avec succès avec PostgreSQL.');

    if (process.env.NODE_ENV !== 'test') {
      app.listen(PORT, () => {
        console.log(`Serveur démarré sur le port ${PORT}`);
      });
    }
  } catch (error) {
    console.error('Erreur au démarrage du serveur :', error);
  }
};

startServer();

module.exports = app;