const express = require('express');
const parcelleController = require('../controllers/parcelleController');
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/roles');
const verifyServiceToken = require('../middleware/verifyServiceToken');
const { uploadParcelDocument } = require('../middleware/uploadParcelDocument');

const router = express.Router();

router.get('/', verifyToken, checkRole(['PROMOTEUR']), parcelleController.getPromoteurParcelles);
router.post(
  '/',
  verifyToken,
  checkRole(['PROMOTEUR']),
  uploadParcelDocument,
  parcelleController.createParcelle,
);
router.get(
  '/:id',
  verifyToken,
  checkRole(['PROMOTEUR', 'CADASTRE', 'NOTAIRE']),
  parcelleController.getPromoteurParcelleById,
);
router.patch(
  '/:id/statut',
  verifyServiceToken,
  parcelleController.updatePromoteurParcelStatus,
);
router.get(
  '/:id/document',
  verifyToken,
  checkRole(['PROMOTEUR', 'CADASTRE', 'NOTAIRE']),
  parcelleController.downloadParcelleDocument,
);

module.exports = router;
