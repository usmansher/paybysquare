import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildDataString, generatePayload } from '../src/index.js';
import { loadCorpus, referenceDecode } from './helpers.js';

const corpus = loadCorpus();

test('conformance corpus is populated', () => {
  assert.ok(corpus.length > 100, `expected a large corpus, got ${corpus.length}`);
});

// @paybysquare/core is the golden source for the corpus, so here we assert the
// build still reproduces it (a regression guard) and that every payload
// round-trips. The cross-language parity guarantee is the mirror of the second
// assertion in the PHP suite, which checks its own output against these same
// golden payloads byte-for-byte.
for (const entry of corpus) {
  test(`corpus ${entry.name}: data string matches`, () => {
    assert.equal(buildDataString(entry.input), entry.tsv);
  });

  test(`corpus ${entry.name}: payload reproduces golden`, () => {
    assert.equal(generatePayload(entry.input), entry.payload);
  });

  test(`corpus ${entry.name}: payload round-trips to tsv`, () => {
    assert.equal(referenceDecode(entry.payload), entry.tsv);
  });
}
