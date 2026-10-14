const express = require('express');
const router = express.Router();
const validationController = require('../controllers/validationController');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/roles');

// Toutes les routes ci-dessous nécessitent d'être connecté et d'avoir le rôle CADASTRE
router.use(auth, checkRole('CADASTRE'));

// 1. Liste des parcelles en attente
router.get('/cadastre', validationController.getPendingCadastre);

// 2. Historique des validations Cadastre
router.get('/cadastre/historique', validationController.getCadastreHistory);

// 3. Détail d'une parcelle
router.get('/cadastre/:id', validationController.getCadastreParcelleDetail);

// 4. Action de valider ou rejeter par le Cadastre
router.post('/cadastre/:id', validationController.validateCadastre);

module.exports = router;