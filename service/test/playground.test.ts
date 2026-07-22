import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildApp } from '../src/app.js';

test('playground is served at / and /playground', async () => {
  const app = buildApp({ rateLimit: false });
  for (const url of ['/', '/playground']) {
    const res = await app.inject({ method: 'GET', url });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] ?? '', /text\/html/);
    assert.match(res.body, /Pay By Square playground/);
    assert.match(res.body, /beneficiaryName/);
  }
  await app.close();
});

test('playground stays reachable with auth enabled (GET is open)', async () => {
  const app = buildApp({ rateLimit: false, authToken: 'secret' });
  const res = await app.inject({ method: 'GET', url: '/playground' });
  assert.equal(res.statusCode, 200);
  await app.close();
});

test('playground can be disabled', async () => {
  const app = buildApp({ rateLimit: false, playground: false });
  const res = await app.inject({ method: 'GET', url: '/playground' });
  assert.equal(res.statusCode, 404);
  await app.close();
});
