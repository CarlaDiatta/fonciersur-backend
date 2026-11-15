const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/server');
const promoterApp = app.createApp('promoteur');
const checkRole = require('../src/middleware/roles');

let server;
let promoterServer;
let baseUrl;
let promoterBaseUrl;

test.before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  promoterServer = promoterApp.listen(0, '127.0.0.1');
  await new Promise((resolve) => promoterServer.once('listening', resolve));
  promoterBaseUrl = `http://127.0.0.1:${promoterServer.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  if (promoterServer) {
    await new Promise((resolve, reject) => promoterServer.close((error) => error ? reject(error) : resolve()));
  }
});

test('versioned health endpoint is available without a database connection', async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', apiVersion: 'v1' });
});

test('health endpoint is not exposed outside the API version prefix', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 404);
});

test('CORS allows the frontend development origin', async () => {
  const response = await fetch(`${baseUrl}/api/v1/health`, {
    headers: { Origin: 'http://localhost:5173' },
  });

  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
});

test('unknown API routes return a JSON 404', async () => {
  const response = await fetch(`${baseUrl}/api/v1/unknown`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Route introuvable.' });
});

test('service profiles expose only their own business routes', async () => {
  const cadastreRoute = await fetch(`${baseUrl}/api/v1/parcelles`);
  const promoterRoute = await fetch(`${promoterBaseUrl}/api/v1/validations`);

  assert.equal(cadastreRoute.status, 404);
  assert.equal(promoterRoute.status, 404);
});

test('Carla scope keeps protected Notaire API routes but hides standalone blockchain proof', async () => {
  const notaireRoute = await fetch(`${baseUrl}/api/v1/validations/notaire`);
  const blockchainProofRoute = await fetch(`${baseUrl}/api/v1/blockchain/proof/reference`);

  assert.equal(notaireRoute.status, 401);
  assert.equal(blockchainProofRoute.status, 404);
});

test('role guard accepts the array form used by route declarations', () => {
  let nextCalled = false;
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  checkRole(['CADASTRE'])({ user: { role: 'CADASTRE' } }, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(response.statusCode, 200);
});

test('role guard blocks a user with a different role', () => {
  let nextCalled = false;
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  checkRole(['CADASTRE'])({ user: { role: 'PROMOTEUR' } }, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(response.statusCode, 403);
});
