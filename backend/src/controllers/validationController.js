const db = require('../config/db');
const Validation = require('../models/Validation');
const blockchainService = require('../services/blockchainService');

/**
 * GET /api/v1/validations/cadastre
 * Liste des parcelles en attente de validation technique (statut SOUMISE)
 */
exports.getPendingCadastre = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, reference, proprio_nom, superficie, statut, created_at FROM parcelles WHERE statut = 'SOUMISE' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur Récupération Cadastre:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/**
 * GET /api/v1/validations/cadastre/:id
 * Consulter le détail complet d'une parcelle avant validation par le Cadastre
 */
exports.getCadastreParcelleDetail = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('SELECT * FROM parcelles WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parcelle introuvable.' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erreur Détail Cadastre:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

/**
 * POST /api/v1/validations/cadastre/:id
 * Body attendu: { decision: 'APPROUVE' | 'REJETE', motif: string }
 */
exports.validateCadastre = async (req, res) => {
  const { id } = req.params;
  const { decision, motif } = req.body;
  const userId = req.user.id;

  try {
    // 1. Transaction Blockchain via le service centralisé
    const fabricResult = await blockchainService.validateByCadastre(id, decision, motif);

    // 2. Mise à jour du statut dans PostgreSQL
    const newStatut = decision === 'APPROUVE' ? 'VALIDE_CADASTRE' : 'REJETE_CADASTRE';
    await db.query('UPDATE parcelles SET statut = $1, updated_at = NOW() WHERE id = $2', [newStatut, id]);

    // 3. Historique dans la table des validations
    const log = await Validation.create({
      parcelle_id: id,
      acteur_id: userId,
      etape: 'CADASTRE',
      decision,
      motif,
    });

    res.json({
      message: `Décision Cadastre enregistrée : ${newStatut}`,
      validation: log,
      fabricTransaction: fabricResult,
    });
  } catch (error) {
    console.error('Erreur Validation Cadastre:', error);
    res.status(500).json({ error: 'Échec du traitement de la validation.', details: error.message });
  }
};

/**
 * GET /api/v1/validations/cadastre/historique
 * Liste de l'historique des dossiers traités par le Cadastre
 */
exports.getCadastreHistory = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM parcelles WHERE statut IN ('VALIDE_CADASTRE', 'REJETE_CADASTRE', 'CERTIFIEE') ORDER BY updated_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur Historique Cadastre:', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};