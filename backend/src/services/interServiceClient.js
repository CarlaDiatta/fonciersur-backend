const jwt = require('jsonwebtoken');
const { secret } = require('../config/jwt');

const SERVICE_ISSUER = 'fonciersur-cadastre-notaire';
const SERVICE_AUDIENCE = 'fonciersur-promoteur';

function serviceUrl(envName, fallback) {
  return (process.env[envName] || fallback).replace(/\/+$/, '');
}

async function requestJson(url, options, action) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    const error = new Error(`Le service ${action} est momentanément injoignable.`);
    error.statusCode = 503;
    throw error;
  }

  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    const error = new Error(body.error || `Le service ${action} a refusé la requête.`);
    error.statusCode = response.status;
    throw error;
  }
  return body;
}

async function createValidationAtCadastre(parcelId, authorization) {
  if (typeof authorization !== 'string' || !/^Bearer\s+\S+$/i.test(authorization)) {
    const error = new Error('Le jeton Promoteur est nécessaire pour transmettre le dossier au Cadastre.');
    error.statusCode = 401;
    throw error;
  }

  const url = `${serviceUrl('CADASTRE_SERVICE_URL', 'http://127.0.0.1:5000')}/api/v1/validations`;
  return requestJson(url, {
    method: 'POST',
    headers: {
      authorization,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ parcel_id: parcelId }),
  }, 'Cadastre');
}

async function getPromoteurParcelle(parcelId, authorization) {
  if (typeof authorization !== 'string' || !/^Bearer\s+\S+$/i.test(authorization)) {
    const error = new Error('Un jeton Promoteur est nécessaire pour lire la parcelle.');
    error.statusCode = 401;
    throw error;
  }

  const url = `${serviceUrl('PROMOTEUR_SERVICE_URL', 'http://127.0.0.1:5001')}/api/v1/parcelles/${encodeURIComponent(parcelId)}`;
  return requestJson(url, {
    method: 'GET',
    headers: { authorization },
  }, 'Promoteur');
}

function createPromoteurServiceToken(actorRole) {
  if (!secret) {
    const error = new Error('JWT_SECRET est requis pour la synchronisation entre services.');
    error.statusCode = 503;
    throw error;
  }

  return jwt.sign(
    { role: 'SERVICE', actorRole, scope: 'parcelles:statut:update' },
    secret,
    {
      expiresIn: '2m',
      issuer: SERVICE_ISSUER,
      audience: SERVICE_AUDIENCE,
    },
  );
}

async function updatePromoteurParcelStatus(parcelId, statut, actorRole) {
  const token = createPromoteurServiceToken(actorRole);
  const url = `${serviceUrl('PROMOTEUR_SERVICE_URL', 'http://127.0.0.1:5001')}/api/v1/parcelles/${encodeURIComponent(parcelId)}/statut`;
  return requestJson(url, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ statut }),
  }, 'Promoteur');
}

module.exports = {
  createValidationAtCadastre,
  getPromoteurParcelle,
  updatePromoteurParcelStatus,
  SERVICE_ISSUER,
  SERVICE_AUDIENCE,
};
