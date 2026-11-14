const { createHash } = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Parcelle = require('../models/Parcelle');
const User = require('../models/User');
const Validation = require('../models/Validation');
const { parcelDocumentDirectory } = require('../middleware/uploadParcelDocument');
const { parseParcelGeometry } = require('../utils/parcelGeometry');
const {
  createValidationAtCadastre,
} = require('../services/interServiceClient');

const validTypes = new Set(['URBAIN', 'AGRICOLE', 'INDUSTRIEL']);

function isValidDocumentSignature(file, header) {
  if (file.mimetype === 'application/pdf') return header.subarray(0, 5).toString() === '%PDF-';
  if (file.mimetype === 'image/png') {
    return header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (file.mimetype === 'image/jpeg') {
    return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  }
  return false;
}

async function removeUploadedFile(file) {
  if (!file) return;
  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Impossible de supprimer un fichier de parcelle :', error);
    }
  }
}

function parcelResponse(parcel, extra = {}) {
  return {
    id: parcel.id,
    reference: parcel.reference,
    numeroIdentificationCadastrale: parcel.numero_identification_cadastrale,
    nicad: parcel.numero_identification_cadastrale,
    localisation: parcel.localisation,
    type: parcel.type_zone,
    superficie: parcel.superficie,
    polygon: parcel.polygon,
    sha256: parcel.sha256,
    statut: parcel.statut,
    hasDocument: Boolean(parcel.titre_plan_storage_name),
    titrePlanName: parcel.titre_plan_original_name,
    created_at: parcel.createdAt,
    updated_at: parcel.updatedAt,
    ...extra,
  };
}

exports.getPromoteurParcelles = async (req, res) => {
  try {
    const parcelles = await Parcelle.findAll({
      where: { proprietaire_id: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    const results = await Promise.all(parcelles.map(async (parcelle) => {
      const validation = await Validation.findOne({
        where: { parcel_id: parcelle.id },
        order: [['createdAt', 'DESC']],
      });
      return parcelResponse(parcelle, {
        motifRejet: validation?.statut?.startsWith('REJETE') ? validation.commentaire : undefined,
      });
    }));

    return res.status(200).json(results);
  } catch (error) {
    console.error('Erreur getPromoteurParcelles :', error);
    return res.status(500).json({ error: 'Impossible de charger les parcelles.' });
  }
};

exports.getPromoteurParcelleById = async (req, res) => {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) {
      return res.status(404).json({ error: 'Parcelle introuvable.' });
    }

    const parcel = await Parcelle.findByPk(req.params.id, {
      include: [{ model: User, as: 'proprietaire', attributes: ['id', 'nom', 'prenom'] }],
    });
    if (
      !parcel ||
      (req.user.role === 'PROMOTEUR' && parcel.proprietaire_id !== req.user.id)
    ) {
      return res.status(404).json({ error: 'Parcelle introuvable.' });
    }

    return res.status(200).json(parcelResponse(parcel, {
      proprio_nom: parcel.proprietaire
        ? `${parcel.proprietaire.prenom} ${parcel.proprietaire.nom}`.trim()
        : undefined,
    }));
  } catch (error) {
    console.error('Erreur getPromoteurParcelleById :', error);
    return res.status(500).json({ error: 'Impossible de charger la parcelle.' });
  }
};

exports.updatePromoteurParcelStatus = async (req, res) => {
  const { actorRole } = req.user;
  const allowedStatuses = {
    CADASTRE: { from: 'SOUMISE', to: ['VALIDE_CADASTRE', 'REJETE_CADASTRE'] },
    NOTAIRE: { from: 'VALIDE_CADASTRE', to: ['CERTIFIEE', 'REJETE_NOTAIRE'] },
  };
  const transition = allowedStatuses[actorRole];
  const statut = req.body?.statut;
  if (!transition || !transition.to.includes(statut)) {
    return res.status(400).json({ error: 'Transition de statut invalide pour ce service.' });
  }

  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) {
      return res.status(404).json({ error: 'Parcelle introuvable.' });
    }

    const parcel = await Parcelle.findByPk(req.params.id);
    if (!parcel) return res.status(404).json({ error: 'Parcelle introuvable.' });
    if (parcel.statut === statut) {
      return res.status(200).json({ id: parcel.id, statut: parcel.statut });
    }
    if (parcel.statut !== transition.from) {
      return res.status(409).json({ error: 'Le statut actuel ne permet pas cette transition.' });
    }

    parcel.statut = statut;
    await parcel.save();
    return res.status(200).json({ id: parcel.id, statut: parcel.statut });
  } catch (error) {
    console.error('Erreur updatePromoteurParcelStatus :', error);
    return res.status(500).json({ error: 'Impossible de synchroniser le statut de la parcelle.' });
  }
};

exports.createParcelle = async (req, res) => {
  const file = req.file;
  let filePersisted = false;

  try {
    if (file) {
      const fileHandle = await fs.open(file.path, 'r');
      const header = Buffer.alloc(8);
      try {
        await fileHandle.read(header, 0, header.length, 0);
      } finally {
        await fileHandle.close();
      }

      if (!isValidDocumentSignature(file, header)) {
        await removeUploadedFile(file);
        return res.status(400).json({ error: 'Le contenu du document ne correspond pas à son format.' });
      }
    }

    const reference = typeof req.body.reference === 'string' ? req.body.reference.trim() : '';
    const nicad = typeof req.body.numeroIdentificationCadastrale === 'string'
      ? req.body.numeroIdentificationCadastrale.trim()
      : '';
    const localisation = typeof req.body.localisation === 'string' ? req.body.localisation.trim() : '';
    const type = typeof req.body.type === 'string' ? req.body.type.trim().toUpperCase() : '';

    if (!reference || !nicad || !localisation || !type) {
      await removeUploadedFile(file);
      return res.status(400).json({ error: 'La référence, le numéro cadastral, la localisation et le type sont obligatoires.' });
    }

    if (!validTypes.has(type)) {
      await removeUploadedFile(file);
      return res.status(400).json({ error: 'Le type de zone doit être URBAIN, AGRICOLE ou INDUSTRIEL.' });
    }

    let geometry;
    try {
      geometry = parseParcelGeometry(req.body.polygon);
    } catch (error) {
      await removeUploadedFile(file);
      return res.status(error.statusCode || 400).json({ error: error.message });
    }

    const canonicalParcel = JSON.stringify({
      reference,
      numeroIdentificationCadastrale: nicad,
      localisation,
      type,
      polygon: geometry.polygon,
    });
    const sha256 = createHash('sha256').update(canonicalParcel).digest('hex');

    const result = await sequelize.transaction(async (transaction) => {
      const byReference = await Parcelle.findOne({
        where: { reference, proprietaire_id: req.user.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const byNicad = await Parcelle.findOne({
        where: {
          numero_identification_cadastrale: nicad,
          proprietaire_id: req.user.id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (byReference && byNicad && byReference.id !== byNicad.id) {
        const error = new Error('La référence et le numéro cadastral appartiennent à deux brouillons différents.');
        error.statusCode = 409;
        throw error;
      }

      const existingParcel = byReference || byNicad;
      if (existingParcel && !['BROUILLON', 'SOUMISE'].includes(existingParcel.statut)) {
        const error = new Error('Une parcelle déjà traitée ne peut pas être modifiée.');
        error.statusCode = 409;
        throw error;
      }
      if (existingParcel?.statut === 'SOUMISE') {
        return { parcel: existingParcel, created: false, fileSaved: false };
      }

      const parcelData = {
        reference,
        numero_identification_cadastrale: nicad,
        localisation,
        type_zone: type,
        superficie: geometry.areaSquareMeters.toFixed(2),
        polygon: geometry.polygon,
        sha256,
        ...(file ? {
          titre_plan_storage_name: file.filename,
          titre_plan_original_name: path.basename(file.originalname),
          titre_plan_mime_type: file.mimetype,
          titre_plan_size: file.size,
        } : {}),
      };

      if (existingParcel) {
        const previousStorageName = existingParcel.titre_plan_storage_name;
        await existingParcel.update(parcelData, { transaction });
        return {
          parcel: existingParcel,
          created: false,
          fileSaved: Boolean(file),
          previousStorageName,
        };
      }

      const parcel = await Parcelle.create({
        ...parcelData,
        proprietaire_id: req.user.id,
        statut: 'BROUILLON',
      }, { transaction });
      return { parcel, created: true, fileSaved: Boolean(file) };
    });

    filePersisted = result.fileSaved;
    if (
      result.fileSaved &&
      result.previousStorageName &&
      result.previousStorageName !== result.parcel.titre_plan_storage_name
    ) {
      await removeUploadedFile({
        path: path.join(parcelDocumentDirectory, result.previousStorageName),
      });
    }
    await createValidationAtCadastre(result.parcel.id, req.get('authorization'));
    result.parcel.statut = 'SOUMISE';
    await result.parcel.save();

    return res.status(result.created ? 201 : 200).json(parcelResponse(result.parcel));
  } catch (error) {
    if (!filePersisted) await removeUploadedFile(file);
    if (error.statusCode) return res.status(error.statusCode).json({
      error: error.statusCode >= 500
        ? `La parcelle reste enregistrée en brouillon, mais sa soumission au Cadastre a échoué : ${error.message}`
        : error.message,
    });
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Cette référence ou ce numéro cadastral est déjà utilisé.' });
    }
    console.error('Erreur createParcelle :', error);
    return res.status(500).json({ error: 'Impossible de créer la parcelle.' });
  }
};

exports.downloadParcelleDocument = async (req, res, next) => {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) {
      return res.status(404).json({ error: 'Document introuvable.' });
    }

    const parcel = await Parcelle.findByPk(req.params.id);
    if (
      !parcel ||
      !parcel.titre_plan_storage_name ||
      (req.user.role === 'PROMOTEUR' && parcel.proprietaire_id !== req.user.id)
    ) {
      return res.status(404).json({ error: 'Document introuvable.' });
    }

    const filePath = path.join(parcelDocumentDirectory, parcel.titre_plan_storage_name);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.type(parcel.titre_plan_mime_type);
    return res.download(filePath, parcel.titre_plan_original_name, (error) => {
      if (error) next(error);
    });
  } catch (error) {
    return next(error);
  }
};

exports.getBlockchainProof = async (req, res) => {
  try {
    const searchValue = typeof req.params.reference === 'string' ? req.params.reference.trim() : '';
    const parcel = await Parcelle.findOne({
      where: {
        [Op.or]: [
          { reference: searchValue },
          { sha256: searchValue.toLowerCase() },
        ],
      },
    });
    if (!parcel) return res.status(404).json({ error: 'Aucune parcelle trouvée pour cette référence.' });

    const validation = await Validation.findOne({
      where: { parcel_id: parcel.id },
      order: [['updatedAt', 'DESC']],
    });
    const txId = validation?.fabric_tx_id || null;

    return res.status(200).json({
      reference: parcel.reference,
      statut: validation?.statut || parcel.statut,
      sha256: parcel.sha256,
      txId,
      timestamp: validation?.updatedAt || parcel.createdAt,
      verified: Boolean(txId),
    });
  } catch (error) {
    console.error('Erreur getBlockchainProof :', error);
    return res.status(500).json({ error: 'Impossible de vérifier cette preuve.' });
  }
};

