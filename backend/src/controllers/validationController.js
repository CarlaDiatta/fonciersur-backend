const { sequelize } = require('../config/db');
const Validation = require('../models/Validation');
const ValidationStatusSync = require('../models/ValidationStatusSync');
const blockchainService = require('../services/blockchainService');
const {
  getPromoteurParcelle,
} = require('../services/interServiceClient');
const { dispatchStatusUpdate } = require('../services/statusSyncService');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validationResponse(validation, parcelData = validation.parcelle_snapshot || {}) {
  return {
    id: validation.id,
    parcelId: validation.parcel_id,
    reference: parcelData.reference || 'Non renseignée',
    numeroIdentificationCadastrale: parcelData.numeroIdentificationCadastrale || parcelData.nicad,
    nicad: parcelData.numeroIdentificationCadastrale || parcelData.nicad,
    type: parcelData.type || parcelData.type_zone,
    localisation: parcelData.localisation,
    superficie: parcelData.superficie,
    polygon: parcelData.polygon,
    sha256: parcelData.sha256,
    proprio_nom: parcelData.proprio_nom || parcelData.proprietaireNom,
    hasDocument: Boolean(parcelData.hasDocument),
    titrePlanName: parcelData.titrePlanName,
    statut: validation.statut,
    motifRejet: validation.statut.startsWith('REJETE') ? validation.commentaire : undefined,
    fabric_tx_id: validation.fabric_tx_id,
    created_at: validation.createdAt,
    updated_at: validation.updatedAt,
  };
}

function loadParcellesForValidations(validations) {
  return validations.map((validation) => validationResponse(validation));
}

function sendBlockchainError(res, error, action) {
  if (error.statusCode === 503) {
    return res.status(503).json({ error: error.message });
  }
  console.error(`Erreur blockchain (${action}) :`, error);
  return res.status(502).json({ error: "La décision n'a pas été enregistrée sur la blockchain." });
}

function sendControllerError(res, error, action) {
  if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
  console.error(`Erreur ${action} :`, error);
  return res.status(500).json({ error: 'Erreur interne du serveur.' });
}

exports.getCadastreList = async (req, res) => {
  try {
    const validations = await Validation.findAll({
      where: { statut: 'SOUMISE' },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(await loadParcellesForValidations(validations));
  } catch (error) {
    return sendControllerError(res, error, 'getCadastreList');
  }
};

exports.getCadastreHistorique = async (req, res) => {
  try {
    const validations = await Validation.findAll({
      where: { statut: ['VALIDE_CADASTRE', 'REJETE_CADASTRE'] },
      order: [['updatedAt', 'DESC']],
    });
    return res.status(200).json(await loadParcellesForValidations(validations));
  } catch (error) {
    return sendControllerError(res, error, 'getCadastreHistorique');
  }
};

exports.getCadastreDetail = async (req, res) => {
  try {
    if (!uuidPattern.test(req.params.id)) return res.status(404).json({ error: 'Dossier introuvable.' });

    const validation = await Validation.findByPk(req.params.id);
    if (!validation) return res.status(404).json({ error: 'Dossier introuvable.' });

    return res.status(200).json(validationResponse(validation));
  } catch (error) {
    return sendControllerError(res, error, 'getCadastreDetail');
  }
};

exports.createValidation = async (req, res) => {
  const parcelId = typeof req.body?.parcel_id === 'string' ? req.body.parcel_id.trim() : '';
  if (!uuidPattern.test(parcelId)) {
    return res.status(400).json({ error: 'parcel_id doit être un identifiant valide.' });
  }

  try {
    const parcelData = await getPromoteurParcelle(parcelId, req.get('authorization'));
    const existingValidation = await Validation.findOne({ where: { parcel_id: parcelId } });
    if (existingValidation) {
      if (existingValidation.statut === 'SOUMISE') {
        return res.status(200).json({
          id: existingValidation.id,
          parcel_id: parcelId,
          statut: existingValidation.statut,
        });
      }
      return res.status(409).json({ error: 'Cette parcelle possède déjà une validation.' });
    }

    if (parcelData.statut !== 'BROUILLON') {
      return res.status(409).json({ error: "Seule une parcelle au statut BROUILLON peut être soumise." });
    }

    let validation;
    try {
      validation = await Validation.create({
        parcel_id: parcelId,
        parcelle_snapshot: parcelData,
        statut: 'SOUMISE',
      });
    } catch (error) {
      if (error.name !== 'SequelizeUniqueConstraintError') throw error;
      validation = await Validation.findOne({ where: { parcel_id: parcelId } });
      if (validation?.statut !== 'SOUMISE') {
        return res.status(409).json({ error: 'Cette parcelle possède déjà une validation.' });
      }
      return res.status(200).json({
        id: validation.id,
        parcel_id: parcelId,
        statut: validation.statut,
      });
    }

    return res.status(201).json({
      id: validation.id,
      parcel_id: parcelId,
      statut: validation.statut,
    });
  } catch (error) {
    return sendControllerError(res, error, 'createValidation');
  }
};

exports.validateByCadastre = async (req, res) => {
  const decision = req.body?.decision;
  const motif = typeof req.body?.motif === 'string' ? req.body.motif.trim() : '';

  if (!['APPROUVE', 'REJETE'].includes(decision)) {
    return res.status(400).json({ error: 'Décision invalide (APPROUVE ou REJETE attendu).' });
  }
  if (decision === 'REJETE' && !motif) {
    return res.status(400).json({ error: 'Le motif est obligatoire en cas de rejet.' });
  }
  if (!uuidPattern.test(req.params.id)) return res.status(404).json({ error: 'Dossier introuvable.' });

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const validation = await Validation.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!validation) {
        const error = new Error('Dossier introuvable.');
        error.statusCode = 404;
        throw error;
      }
      if (validation.statut !== 'SOUMISE') {
        const error = new Error("Ce dossier n'est pas au statut SOUMISE.");
        error.statusCode = 409;
        throw error;
      }

      const newStatus = decision === 'APPROUVE' ? 'VALIDE_CADASTRE' : 'REJETE_CADASTRE';
      const txResult = await blockchainService.validateByCadastre(
        validation.parcel_id,
        req.user.id,
        newStatus,
        motif || 'Approuvé par le cadastre',
      );
      if (!txResult?.txId) {
        const error = new Error("Le service blockchain n'a pas retourné d'identifiant de transaction.");
        error.statusCode = 503;
        throw error;
      }

      validation.statut = newStatus;
      validation.acteur_id = req.user.id;
      validation.commentaire = motif || 'Approuvé par le cadastre';
      validation.fabric_tx_id = txResult.txId;
      await validation.save({ transaction });
      const statusSync = await ValidationStatusSync.create({
        parcel_id: validation.parcel_id,
        statut: newStatus,
        actor_role: 'CADASTRE',
      }, { transaction });

      return { validation, statusSync, txId: txResult.txId };
    });

    const synchronisationEnAttente = !(await dispatchStatusUpdate(result.statusSync));

    return res.status(200).json({
      message: synchronisationEnAttente
        ? 'Décision enregistrée; la synchronisation avec le service Promoteur est en attente.'
        : 'Validation du cadastre enregistrée avec succès.',
      validation: validationResponse(result.validation),
      fabricTransaction: result.txId,
      synchronisationEnAttente,
    });
  } catch (error) {
    if (error.statusCode === 503 || error.name === 'BlockchainUnavailableError') {
      return sendBlockchainError(res, error, 'Cadastre');
    }
    if (error.statusCode === 502) return sendBlockchainError(res, error, 'Cadastre');
    return sendControllerError(res, error, 'validateByCadastre');
  }
};

exports.getNotaireList = async (req, res) => {
  try {
    const validations = await Validation.findAll({
      where: { statut: 'VALIDE_CADASTRE' },
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json(await loadParcellesForValidations(validations));
  } catch (error) {
    return sendControllerError(res, error, 'getNotaireList');
  }
};

exports.getNotaireHistorique = async (req, res) => {
  try {
    const validations = await Validation.findAll({
      where: { statut: ['CERTIFIEE', 'REJETE_NOTAIRE'] },
      order: [['updatedAt', 'DESC']],
    });
    return res.status(200).json(await loadParcellesForValidations(validations));
  } catch (error) {
    return sendControllerError(res, error, 'getNotaireHistorique');
  }
};

exports.getNotaireDetail = async (req, res) => {
  try {
    if (!uuidPattern.test(req.params.id)) return res.status(404).json({ error: 'Dossier introuvable.' });

    const validation = await Validation.findByPk(req.params.id);
    if (!validation) return res.status(404).json({ error: 'Dossier introuvable.' });

    return res.status(200).json(validationResponse(validation));
  } catch (error) {
    return sendControllerError(res, error, 'getNotaireDetail');
  }
};

exports.certifyByNotaire = async (req, res) => {
  const decision = req.body?.decision;
  const motif = typeof req.body?.motif === 'string' ? req.body.motif.trim() : '';

  if (!['CERTIFIE', 'REJETE'].includes(decision)) {
    return res.status(400).json({ error: 'Décision invalide (CERTIFIE ou REJETE attendu).' });
  }
  if (decision === 'REJETE' && !motif) {
    return res.status(400).json({ error: 'Le motif est obligatoire en cas de rejet.' });
  }
  if (!uuidPattern.test(req.params.id)) return res.status(404).json({ error: 'Dossier introuvable.' });

  try {
    const result = await sequelize.transaction(async (transaction) => {
      const validation = await Validation.findByPk(req.params.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!validation) {
        const error = new Error('Dossier introuvable.');
        error.statusCode = 404;
        throw error;
      }
      if (validation.statut !== 'VALIDE_CADASTRE') {
        const error = new Error("Ce dossier n'a pas été validé par le cadastre au préalable.");
        error.statusCode = 409;
        throw error;
      }

      const newStatus = decision === 'CERTIFIE' ? 'CERTIFIEE' : 'REJETE_NOTAIRE';
      const txResult = await blockchainService.certifyByNotaire(
        validation.parcel_id,
        req.user.id,
        newStatus,
        motif || 'Certifié par le notaire',
      );
      if (!txResult?.txId) {
        const error = new Error("Le service blockchain n'a pas retourné d'identifiant de transaction.");
        error.statusCode = 503;
        throw error;
      }

      validation.statut = newStatus;
      validation.acteur_id = req.user.id;
      validation.commentaire = motif || 'Certifié par le notaire';
      validation.fabric_tx_id = txResult.txId;
      await validation.save({ transaction });
      const statusSync = await ValidationStatusSync.create({
        parcel_id: validation.parcel_id,
        statut: newStatus,
        actor_role: 'NOTAIRE',
      }, { transaction });

      return { validation, statusSync, txId: txResult.txId };
    });

    const synchronisationEnAttente = !(await dispatchStatusUpdate(result.statusSync));

    return res.status(200).json({
      message: synchronisationEnAttente
        ? 'Décision enregistrée; la synchronisation avec le service Promoteur est en attente.'
        : 'Certification notariale enregistrée avec succès.',
      validation: validationResponse(result.validation),
      fabricTransaction: result.txId,
      synchronisationEnAttente,
    });
  } catch (error) {
    if (error.statusCode === 503 || error.name === 'BlockchainUnavailableError') {
      return sendBlockchainError(res, error, 'Notaire');
    }
    if (error.statusCode === 502) return sendBlockchainError(res, error, 'Notaire');
    return sendControllerError(res, error, 'certifyByNotaire');
  }
};
