const jwt = require('jsonwebtoken');
const { secret } = require('../config/jwt');
const { SERVICE_AUDIENCE, SERVICE_ISSUER } = require('../services/interServiceClient');

const verifyServiceToken = (req, res, next) => {
  const authorization = req.get('authorization');
  const match = typeof authorization === 'string'
    ? authorization.match(/^Bearer\s+([^\s]+)$/i)
    : null;
  if (!match || !secret) {
    return res.status(401).json({ error: 'Jeton de service manquant ou invalide.' });
  }

  try {
    const decoded = jwt.verify(match[1], secret, {
      issuer: SERVICE_ISSUER,
      audience: SERVICE_AUDIENCE,
    });
    if (decoded.role !== 'SERVICE' || decoded.scope !== 'parcelles:statut:update') {
      return res.status(403).json({ error: 'Droits de synchronisation insuffisants.' });
    }
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Jeton de service manquant ou invalide.' });
  }
};

module.exports = verifyServiceToken;
