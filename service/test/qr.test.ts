import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTestApp, PNG_MAGIC, VALID_INPUT } from './helpers.js';

test('POST /v1/qr returns a PNG by default', async () => {
  const app = buildTestApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/qr',
    payload: VALID_INPUT,
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['content-type'], 'image/png');
  const bytes = response.rawPayload;
  assert.deepEqual(bytes.subarray(0, PNG_MAGIC.length), PNG_MAGIC);
  await app.close();
});

test('POST /v1/qr?format=svg returns SVG markup', async () => {
  const app = buildTestApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/qr?format=svg',
    payload: VALID_INPUT,
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.headers['content-type'], 'image/svg+xml');
  assert.ok(response.body.includes('<svg'));
  await app.close();
});

test('POST /v1/qr rejects an unknown format', async () => {
  const app = buildTestApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/qr?format=gif',
    payload: VALID_INPUT,
  });

  assert.equal(response.statusCode, 400);
  const body = response.json() as { error: { field: string } };
  assert.equal(body.error.field, 'format');
  await app.close();
});

test('POST /v1/qr rejects size out of range', async () => {
  const app = buildTestApp();
  for (const size of ['63', '1025', '-1', 'abc', '256.5']) {
    const response = await app.inject({
      method: 'POST',
      url: `/v1/qr?size=${size}`,
      payload: VALID_INPUT,
    });
    assert.equal(response.statusCode, 400, `size=${size}`);
    const body = response.json() as { error: { field: string } };
    assert.equal(body.error.field, 'size');
  }
  await app.close();
});

test('POST /v1/qr accepts size bounds 64 and 1024', async () => {
  const app = buildTestApp();
  for (const size of ['64', '1024']) {
    const response = await app.inject({
      method: 'POST',
      url: `/v1/qr?size=${size}`,
      payload: VALID_INPUT,
    });
    assert.equal(response.statusCode, 200, `size=${size}`);
  }
  await app.close();
});

test('POST /v1/qr propagates validation errors from core', async () => {
  const app = buildTestApp();
  const response = await app.inject({
    method: 'POST',
    url: '/v1/qr',
    payload: { ...VALID_INPUT, amount: -1 },
  });

  assert.equal(response.statusCode, 400);
  const body = response.json() as { error: { field: string } };
  assert.equal(body.error.field, 'amount');
  await app.close();
});
