const express = require('express');
const cors = require('cors');

const { connectDB, sequelize } = require('./config/db');
const { secret } = require('./config/jwt');
const createRoutes = require('./routes');
const { migrateValidationSchema } = require('./config/migrations');
const { retryPendingStatusUpdates } = require('./services/statusSyncService');

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

function createApp(serviceRole = 'cadastre-notaire') {
  const app = express();
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) return callback(null, true);
      return callback(new Error("Origine non autorisée par la configuration CORS."));
    },
  }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.get('/api/v1/health', (req, res) => res.status(200).json({ status: 'ok', apiVersion: 'v1' }));
  app.use('/api/v1', createRoutes(serviceRole));
  app.use((req, res) => res.status(404).json({ error: 'Route introuvable.' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'Le document ne doit pas dépasser 10 Mo.' });
    }
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    if (error instanceof SyntaxError && Object.prototype.hasOwnProperty.call(error, 'body')) {
      return res.status(400).json({ error: 'Le corps JSON de la requête est invalide.' });
    }
    console.error('Erreur serveur non gérée :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  });
  return app;
}

const startServer = async (serviceRole = process.env.SERVICE_ROLE || 'cadastre-notaire') => {
  if (!['cadastre-notaire', 'promoteur'].includes(serviceRole)) {
    throw new Error('Le profil doit être cadastre-notaire ou promoteur.');
  }
  if (!secret) throw new Error('JWT_SECRET est absent. Configurez-le dans le fichier .env local.');
  await connectDB();
  await migrateValidationSchema();
  await sequelize.sync();
  console.log('Connexion à PostgreSQL et modèles vérifiés.');

  const port = serviceRole === 'promoteur' ? 5001 : 5000;
  const app = createApp(serviceRole);
  if (serviceRole === 'cadastre-notaire') {
    const retryTimer = setInterval(() => {
      retryPendingStatusUpdates().catch((error) => {
        console.error('Échec de la reprise des synchronisations en attente :', error);
      });
    }, 10_000);
    retryTimer.unref();
  }
  return app.listen(port, () => console.log(`Serveur démarré sur le port ${port}`));
};

if (require.main === module) {
  startServer(process.argv[2] || process.env.SERVICE_ROLE || 'cadastre-notaire').catch((error) => {
    console.error('Erreur au démarrage du serveur :', error);
    process.exitCode = 1;
  });
}

const app = createApp();
module.exports = app;
module.exports.startServer = startServer;
module.exports.createApp = createApp;
