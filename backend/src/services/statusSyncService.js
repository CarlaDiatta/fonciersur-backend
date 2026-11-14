const { Op } = require('sequelize');
const ValidationStatusSync = require('../models/ValidationStatusSync');
const { updatePromoteurParcelStatus } = require('./interServiceClient');

async function dispatchStatusUpdate(syncEvent) {
  try {
    await updatePromoteurParcelStatus(syncEvent.parcel_id, syncEvent.statut, syncEvent.actor_role);
    syncEvent.delivered_at = new Date();
    syncEvent.last_error = null;
  } catch (error) {
    syncEvent.last_error = error.message.slice(0, 1000);
    console.error(`Synchronisation du statut ${syncEvent.parcel_id} vers Promoteur échouée :`, error.message);
  }

  syncEvent.attempts += 1;
  await syncEvent.save();
  return syncEvent.delivered_at !== null;
}

async function retryPendingStatusUpdates() {
  const pending = await ValidationStatusSync.findAll({
    where: {
      delivered_at: null,
      attempts: { [Op.lt]: 10 },
    },
    order: [['createdAt', 'ASC']],
    limit: 50,
  });

  for (const syncEvent of pending) {
    await dispatchStatusUpdate(syncEvent);
  }
}

module.exports = {
  dispatchStatusUpdate,
  retryPendingStatusUpdates,
};
