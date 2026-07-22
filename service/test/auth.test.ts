import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTestApp, VALID_INPUT } from './helpers.js';

const TOKEN = 'test-secret-token';

test('auth enabled: POST without a token returns 401', async () => {
  const app = buildTestApp({ authToken: TOKEN });
  const response = await app.inject({
    method: 'POST',
    url: '/v1/payload',
    payload: VALID_INPUT,
  });

  assert.equal(response.statusCode, 401);
  const body = response.json() as { error: { message: string } };
  assert.equal(body.error.message, 'unauthorized');
  await app.close();
});

test('auth enabled: POST with a wrong token returns 401', async () => {
  const app = buildTestApp({ authToken: TOKEN });
  const response = await app.inject({
    method: 'POST',
    url: '/v1/payload',
    payload: VALID_INPUT,
    headers: { authorization: 'Bearer wrong-token' },
  });

  assert.equal(response.statusCode, 401);
  await app.close();
});

test('auth enabled: POST with the correct token returns 200', async () => {
  const app = buildTestApp({ authToken: TOKEN });
  const response = await app.inject({
    method: 'POST',
    url: '/v1/payload',
    payload: VALID_INPUT,
    headers: { authorization: `Bearer ${TOKEN}` },
  });

  assert.equal(response.statusCode, 200);
  await app.close();
});

test('auth enabled: GET endpoints stay open', async () => {
  const app = buildTestApp({ authToken: TOKEN });
  const response = await app.inject({ method: 'GET', url: '/healthz' });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: 'ok' });
  await app.close();
});

test('auth disabled: POST endpoints are open', async () => {
  const app = buildTestApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/payload',
    payload: VALID_INPUT,
  });

  assert.equal(response.statusCode, 200);
  await app.close();
});
