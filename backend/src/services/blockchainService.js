function blockchainUnavailable() {
  const error = new Error(
    "L'intégration Hyperledger Fabric n'est pas configurée. Aucune décision n'a été enregistrée.",
  );
  error.name = 'BlockchainUnavailableError';
  error.statusCode = 503;
  return error;
}

async function validateByCadastre(parcelId, userId, statut, motif) {
  void parcelId;
  void userId;
  void statut;
  void motif;
  throw blockchainUnavailable();
}

async function certifyByNotaire(parcelId, userId, statut, motif) {
  void parcelId;
  void userId;
  void statut;
  void motif;
  throw blockchainUnavailable();
}

module.exports = {
  validateByCadastre,
  certifyByNotaire,
};
