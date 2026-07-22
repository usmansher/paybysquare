import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generatePayload, ValidationError } from '../src/index.js';

const input = {
  amount: 10,
  iban: 'SK7283300000009111111118',
  beneficiaryName: 'John Doe',
  date: '2026-07-21',
};

test('defaults to the payment document type', () => {
  assert.equal(generatePayload(input), generatePayload(input, 'payment'));
});

test('payment payload carries a zero type/version frame header', () => {
  // The header bytes 0x00 (type) 0x00 (version) contribute 15 leading zero
  // bits, i.e. the payload always starts "000" in base32hex.
  assert.match(generatePayload(input), /^000/);
});

test('rejects an unsupported document type', () => {
  assert.throws(
    () => generatePayload(input, 'standing_order' as never),
    (error: unknown) =>
      error instanceof ValidationError && error.field === 'documentType',
  );
});
