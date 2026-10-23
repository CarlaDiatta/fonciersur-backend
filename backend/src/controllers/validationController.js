const Validation = require('../models/Validation');
// Note : Le service blockchain (de Coumba/Lady) sera branché ici. 
// Pour l'instant, on gère la logique de validation et le mock/appel.
const blockchainService = {
  async validateByCadastre(parcelId, userId, decision, comment) {
    // Si blockchainService.js existe, il gère l'appel Fabric, sinon on simule
    return { txId: 'tx_mock_cadastre_' + Date.now() };
  },
  async certifyByNotaire(parcelId, userId, comment, status) {
    return { txId: 'tx_mock_notaire_' + Date.now() };
  }
};

// -----------------------------------------------------------------------------
// CADASTRE
// -----------------------------------------------------------------------------
exports.getCadastreList = async (req, res) => {
  try {
    // Récupère les parcelles au statut SOUMISE
    const validations = await Validation.findAll({
      where: { statut: 'SOUMISE' },
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json(validations);
  } catch (error) {
    console.error('Erreur getCadastreList :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};

exports.getCadastreHistorique = async (req, res) => {
  try {
    const validations = await Validation.findAll({
      where: { statut: ['APPROUVE', 'REJETE'] },
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json(validations);
  } catch (error) {
    console.error('Erreur getCadastreHistorique :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};

exports.getCadastreDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = await Validation.findByPk(id);
    if (!validation) {
      return res.status(404).json({ error: 'Parcelle/Validation introuvable.' });
    }
    return res.status(200).json(validation);
  } catch (error) {
    console.error('Erreur getCadastreDetail :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};

exports.validateByCadastre = async (req, res) => {
  try {
    const { id } = req.params; // parcel_id ou id de validation
    const { decision, motif } = req.body; // decision: "APPROUVE" ou "REJETE"

    if (!['APPROUVE', 'REJETE'].includes(decision)) {
      return res.status(400).json({ error: 'Décision invalide (APPROUVE ou REJETE attendu).' });
    }

    if (decision === 'REJETE' && !motif) {
      return res.status(400).json({ error: 'Le motif est obligatoire en cas de rejet.' });
    }

    const validation = await Validation.findByPk(id);
    if (!validation) {
      return res.status(404).json({ error: 'Dossier introuvable.' });
    }

    // Chaîne stricte : Le cadastre ne traite que les SOUMISE
    if (validation.statut !== 'SOUMISE') {
      return res.status(409).json({ error: "Ce dossier n'est pas au statut SOUMISE." });
    }

    const newStatus = decision === 'APPROUVE' ? 'VALIDE_CADASTRE' : 'REJETE_CADASTRE';

    // Règle d'or : Fabric d'abord, base ensuite
    let txResult;
    try {
      txResult = await blockchainService.validateByCadastre(validation.parcel_id, req.user.id, newStatus, motif || '');
    } catch (fabricError) {
      console.error('Erreur Fabric (Cadastre) :', fabricError);
      return res.status(500).json({ error: "Échec de l'enregistrement sur la blockchain. Rien n'a été modifié." });
    }

    // Mise à jour en base de données
    validation.statut = newStatus;
    validation.acteur_id = req.user.id;
    validation.commentaire = motif || 'Approuvé par le cadastre';
    validation.fabric_tx_id = txResult.txId;
    await validation.save();

    return res.status(200).json({
      message: 'Validation du cadastre enregistrée avec succès.',
      validation,
      fabricTransaction: txResult.txId
    });
  } catch (error) {
    console.error('Erreur validateByCadastre :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};

// -----------------------------------------------------------------------------
// NOTAIRE
// -----------------------------------------------------------------------------
exports.getNotaireList = async (req, res) => {
  try {
    const validations = await Validation.findAll({
      where: { statut: 'VALIDE_CADASTRE' },
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json(validations);
  } catch (error) {
    console.error('Erreur getNotaireList :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};

exports.getNotaireHistorique = async (req, res) => {
  try {
    const validations = await Validation.findAll({
      where: { statut: ['CERTIFIEE', 'REJETE_NOTAIRE'] },
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json(validations);
  } catch (error) {
    console.error('Erreur getNotaireHistorique :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};

exports.getNotaireDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const validation = await Validation.findByPk(id);
    if (!validation) {
      return res.status(404).json({ error: 'Dossier introuvable.' });
    }
    return res.status(200).json(validation);
  } catch (error) {
    console.error('Erreur getNotaireDetail :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};

exports.certifyByNotaire = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, motif } = req.body; // decision: "CERTIFIE" ou "REJETE"

    if (!['CERTIFIE', 'REJETE'].includes(decision)) {
      return res.status(400).json({ error: 'Décision invalide (CERTIFIE ou REJETE attendu).' });
    }

    if (decision === 'REJETE' && !motif) {
      return res.status(400).json({ error: 'Le motif est obligatoire en cas de rejet.' });
    }

    const validation = await Validation.findByPk(id);
    if (!validation) {
      return res.status(404).json({ error: 'Dossier introuvable.' });
    }

    // Le notaire ne traite que les VALIDE_CADASTRE
    if (validation.statut !== 'VALIDE_CADASTRE') {
      return res.status(409).json({ error: "Ce dossier n'a pas été validé par le cadastre au préalable." });
    }

    const newStatus = decision === 'CERTIFIE' ? 'CERTIFIEE' : 'REJETE_NOTAIRE';

    // Règle d'or : Fabric d'abord
    let txResult;
    try {
      txResult = await blockchainService.certifyByNotaire(validation.parcel_id, req.user.id, motif || '', newStatus);
    } catch (fabricError) {
      console.error('Erreur Fabric (Notaire) :', fabricError);
      return res.status(500).json({ error: "Échec de la certification sur la blockchain. Rien n'a été modifié." });
    }

    validation.statut = newStatus;
    validation.acteur_id = req.user.id;
    validation.commentaire = motif || 'Certifié par le notaire';
    validation.fabric_tx_id = txResult.txId;
    await validation.save();

    return res.status(200).json({
      message: 'Certification du notaire enregistrée avec succès.',
      validation,
      fabricTransaction: txResult.txId
    });
  } catch (error) {
    console.error('Erreur certifyByNotaire :', error);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
};