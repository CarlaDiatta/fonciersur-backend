const express = require('express');
const authRoutes = require('./authRoutes');
const validationRoutes = require('./validationRoutes');
const parcelleRoutes = require('./parcelleRoutes');
const parcelleController = require('../controllers/parcelleController');

function createRoutes(serviceRole = 'cadastre-notaire') {
  const router = express.Router();
  router.use('/auth', authRoutes);
  router.get('/blockchain/proof/:reference', parcelleController.getBlockchainProof);

  if (serviceRole === 'cadastre-notaire') {
    router.use('/validations', validationRoutes);
  } else if (serviceRole === 'promoteur') {
    router.use('/parcelles', parcelleRoutes);
  } else {
    throw new Error(`Profil de service inconnu : ${serviceRole}`);
  }

  return router;
}

module.exports = createRoutes;