const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importation de l'agrégateur de toutes les routes de l'application
const routes = require('./routes');

const app = express();

// 1. Middlewares globaux
app.use(cors()); // Autorise le Frontend React à faire des requêtes vers ce serveur
app.use(express.json()); // Permet à Express de lire le JSON envoyé dans les requêtes (body)

// 2. Définition des routes principales
// Toutes les routes de l'application commenceront par /api/v1
app.use('/api/v1', routes);

// 3. Route de test (Health check)
app.get('/', (req, res) => {
  res.json({
    message: 'API FoncierSur opérationnelle !',
    version: '1.0.0',
    status: 'Running'
  });
});

// 4. Démarrage du serveur sur le port défini dans le fichier .env
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Backend Core] Serveur lancé sur le port ${PORT}`);
  console.log(`[URL] http://localhost:${PORT}`);
});