import assert from 'node:assert/strict';
import { test } from 'node:test';

import { generatePayload, ValidationError } from '../src/index.js';

const valid = {
  amount: 10,
  iban: 'SK7283300000009111111118',
  beneficiaryName: 'John Doe',
  date: '2026-07-21',
};

test('accepts IBAN with spaces and lowercase', () => {
  const payload = generatePayload({
    ...valid,
    iban: 'sk72 8330 0000 0091 1111 1118',
  });
  assert.match(payload, /^[0-9A-V]+$/);
});

test('defaults date to today when omitted', () => {
  const payload = generatePayload({
    amount: 1,
    iban: valid.iban,
    beneficiaryName: 'X',
  });
  assert.match(payload, /^[0-9A-V]+$/);
});

const rejected: Array<[string, Record<string, unknown>, string]> = [
  ['missing beneficiary name', { ...valid, beneficiaryName: '' }, 'beneficiaryName'],
  ['whitespace beneficiary name', { ...valid, beneficiaryName: '   ' }, 'beneficiaryName'],
  ['zero amount', { ...valid, amount: 0 }, 'amount'],
  ['negative amount', { ...valid, amount: -5 }, 'amount'],
  ['amount with 3 decimals', { ...valid, amount: 1.005 }, 'amount'],
  ['NaN amount', { ...valid, amount: Number.NaN }, 'amount'],
  ['bad IBAN', { ...valid, iban: 'NOT-AN-IBAN' }, 'iban'],
  ['bad SWIFT', { ...valid, swift: 'X' }, 'swift'],
  ['bad currency', { ...valid, currency: 'EURO' }, 'currency'],
  ['non-numeric variable symbol', { ...valid, variableSymbol: '12A' }, 'variableSymbol'],
  ['variable symbol too long', { ...valid, variableSymbol: '12345678901' }, 'variableSymbol'],
  ['constant symbol too long', { ...valid, constantSymbol: '12345' }, 'constantSymbol'],
  ['note too long', { ...valid, note: 'x'.repeat(141) }, 'note'],
  ['amount too large', { ...valid, amount: 0xffffffff + 1 }, 'amount'],
  ['beneficiary name too long', { ...valid, beneficiaryName: 'x'.repeat(71) }, 'beneficiaryName'],
  ['tab in note', { ...valid, note: 'a\tb' }, 'note'],
  ['newline in note', { ...valid, note: 'a\nb' }, 'note'],
  ['tab in beneficiary name', { ...valid, beneficiaryName: 'Evil\tDE89' }, 'beneficiaryName'],
  ['carriage return in address1', { ...valid, beneficiaryAddress1: 'a\rb' }, 'beneficiaryAddress1'],
  ['control char in address2', { ...valid, beneficiaryAddress2: 'a\u0007b' }, 'beneficiaryAddress2'],
  ['malformed date string', { ...valid, date: '21.07.2026' }, 'date'],
  ['impossible date', { ...valid, date: '2026-13-45' }, 'date'],
];

for (const [name, input, field] of rejected) {
  test(`rejects ${name}`, () => {
    assert.throws(
      () => generatePayload(input as never),
      (error: unknown) =>
        error instanceof ValidationError && error.field === field,
    );
  });
}
