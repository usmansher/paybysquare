import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { findSpecPath } from '../src/openapi.js';
import { buildTestApp, VALID_INPUT } from './helpers.js';

const HTTP_METHODS = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]);

interface OpenApiDocument {
  paths: Record<string, Record<string, unknown>>;
}

test('every path+method in spec/openapi.yaml exists in the app', async () => {
  const doc = parseYaml(
    readFileSync(findSpecPath(), 'utf8'),
  ) as OpenApiDocument;
  assert.ok(doc.paths, 'spec has a paths object');

  const app = buildTestApp();
  await app.ready();

  for (const [path, operations] of Object.entries(doc.paths)) {
    for (const method of Object.keys(operations)) {
      if (!HTTP_METHODS.has(method)) {
        continue;
      }
      const response = await app.inject({
        method: method.toUpperCase() as 'GET' | 'POST',
        url: path,
        ...(method === 'post' ? { payload: VALID_INPUT } : {}),
      });
      assert.notEqual(
        response.statusCode,
        404,
        `${method.toUpperCase()} ${path} is documented but not routed`,
      );
      assert.notEqual(
        response.statusCode,
        405,
        `${method.toUpperCase()} ${path} is documented but the method is not allowed`,
      );
    }
  }

  await app.close();
});

test('GET /v1/openapi.json serves the contract', async () => {
  const app = buildTestApp();
  const response = await app.inject({ method: 'GET', url: '/v1/openapi.json' });

  assert.equal(response.statusCode, 200);
  const body = response.json() as { openapi?: string; paths?: object };
  assert.match(body.openapi ?? '', /^3\.1\./);
  assert.ok(body.paths && '/v1/payload' in body.paths);
  await app.close();
});
