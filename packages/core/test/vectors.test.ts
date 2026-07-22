import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildDataString, generatePayload } from '../src/index.js';
import { loadVectors, referenceDecode } from './helpers.js';

for (const vector of loadVectors()) {
  test(`vector ${vector.name}: data string matches spec byte-for-byte`, () => {
    assert.equal(buildDataString(vector.input), vector.tsv);
  });

  test(`vector ${vector.name}: payload decodes via reference verifier`, () => {
    const payload = generatePayload(vector.input);
    assert.match(payload, /^[0-9A-V]+$/);
    assert.equal(referenceDecode(payload), vector.tsv);
  });
}

// Note: that each vector's `payloadReference` (liblzma output, which contains
// real matches) decodes back to its `tsv` is a property of the vector file
// itself, not of this implementation. It is asserted once by the language-
// neutral spec self-check (spec/tools/selfcheck.py) rather than in every
// language suite, so the suites need no Python/liblzma runtime.
