/**
 * Generate spec/conformance-corpus.json — a large, diverse set of payment
 * inputs with their expected TSV and expected payload.
 *
 * The @paybysquare/core (TypeScript) build is the GOLDEN source: it produces
 * the `payload` for each entry. Every implementation's conformance test then
 * asserts byte-identical output against these payloads, which is what enforces
 * cross-language parity across a wide input space (not just the 5 curated
 * vectors). Because both in-repo encoders are deterministic and literal-only,
 * TS and PHP must agree byte-for-byte; any divergence fails the PHP suite.
 *
 * Regenerate after an intentional encoding change:
 *   cd packages/core && npm run build
 *   node ../../spec/tools/generate_corpus.mjs
 *   cp spec/conformance-corpus.json packages/php/tests/conformance-corpus.json
 *
 * Deterministic (seeded PRNG) so regeneration is stable in version control.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDataString, generatePayload } from '../../packages/core/dist/index.js';

// Deterministic PRNG (mulberry32) so the corpus is reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0x50425351); // "PBSQ"
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const digits = (n) =>
  Array.from({ length: n }, () => Math.floor(rand() * 10)).join('');

// Character pools that stay within the "no control characters" rule and
// exercise 1-, 2- and 3-byte UTF-8 sequences (the literal coder / carry paths).
const ASCII = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .,-/&()';
const SLOVAK = 'áäčďéíĺľňóôŕšťúýžÁÄČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ';
const MIXED = ASCII + SLOVAK + '€₤§µ°±—…';
function randText(pool, len) {
  let out = '';
  const chars = [...pool];
  for (let i = 0; i < len; i++) out += chars[Math.floor(rand() * chars.length)];
  return out;
}

// Valid IBANs of varying lengths (format-level, matching the spec regex).
const IBANS = [
  'SK7283300000009111111118',
  'CZ6508000000192000145399',
  'DE89370400440532013000',
  'AT611904300234573201',
  'CH9300762011623852957',
  'LI21088100002324013AAAA',
  'GB29NWBK60161331926819',
  'FR1420041010050500013M02606',
];
const SWIFTS = ['', 'FIOZSKBAXXX', 'GIBASKBX', 'TATRSKBX', 'SUBASKBXXXX'];
const CURRENCIES = ['EUR', 'CZK', 'USD', 'GBP', 'PLN'];
const DATES = ['2026-01-01', '2026-07-21', '2026-12-31', '2024-02-29', '2000-06-15'];
const AMOUNTS = [
  0.01, 0.1, 1, 5, 9.99, 10, 25.5, 100, 999.99, 1000, 12345.67, 100000,
  9999999.99, 42949672.95, 1, 2, 3.33,
];

const entries = [];
const seenTsv = new Set();
const usedNames = new Set();
function add(name, input) {
  const tsv = buildDataString(input);
  if (seenTsv.has(tsv)) return; // keep entries distinct at the data-string level
  seenTsv.add(tsv);
  // Names double as data-provider keys in the PHP suite, so they must be unique.
  let uniqueName = name;
  for (let i = 2; usedNames.has(uniqueName); i++) uniqueName = `${name}#${i}`;
  usedNames.add(uniqueName);
  entries.push({ name: uniqueName, input, tsv, payload: generatePayload(input) });
}

// 1. Boundary lengths for every free-text field.
for (const len of [0, 1, 2, 69, 70]) {
  add(`beneficiaryName-len-${Math.max(len, 1)}`, {
    amount: 12.34,
    iban: IBANS[0],
    beneficiaryName: randText(MIXED, Math.max(len, 1)),
    date: DATES[0],
  });
  add(`note-len-${len}`, {
    amount: 12.34,
    iban: IBANS[0],
    beneficiaryName: 'Boundary Note',
    note: randText(MIXED, len),
    date: DATES[0],
  });
  add(`address-len-${len}`, {
    amount: 12.34,
    iban: IBANS[0],
    beneficiaryName: 'Boundary Addr',
    beneficiaryAddress1: randText(ASCII, len),
    beneficiaryAddress2: randText(MIXED, len),
    date: DATES[0],
  });
}
// note exactly at the 140-char cap, and stress bytes.
add('note-max-140-ascii', {
  amount: 77.7, iban: IBANS[1], beneficiaryName: 'Max Note',
  note: randText(ASCII, 140), date: DATES[1],
});
add('note-max-70-slovak', {
  amount: 77.7, iban: IBANS[1], beneficiaryName: 'Max Note SK',
  note: randText(SLOVAK, 70), date: DATES[1],
});

// 2. Amount coverage.
for (const amount of AMOUNTS) {
  add(`amount-${amount}`, {
    amount, iban: IBANS[2], beneficiaryName: 'Amount Case', date: DATES[2],
  });
}

// 3. Symbol combinations across their digit-length ranges.
for (const [vs, ks, ss] of [
  ['', '', ''], ['1', '1', '1'], ['1234567890', '0308', '9876543210'],
  ['2026001', '', '99'], ['', '0558', ''], ['999', '1', '7'],
]) {
  add(`symbols-${vs || 'x'}-${ks || 'x'}-${ss || 'x'}`, {
    amount: 55.55, iban: IBANS[3], beneficiaryName: 'Symbols',
    variableSymbol: vs, constantSymbol: ks, specificSymbol: ss, date: DATES[3],
  });
}

// 4. Cross-product of IBAN / SWIFT / currency / date.
for (const iban of IBANS) {
  for (const swift of SWIFTS) {
    add(`combo-${iban.slice(0, 4)}-${swift || 'nosw'}`, {
      amount: Number((rand() * 5000 + 0.01).toFixed(2)),
      iban,
      beneficiaryName: randText(MIXED, 1 + Math.floor(rand() * 40)),
      swift,
      currency: pick(CURRENCIES),
      date: pick(DATES),
      variableSymbol: digits(1 + Math.floor(rand() * 10)),
    });
  }
}

// 5. High-entropy randomized fill — the bulk of the corpus, to exercise the
// range coder's carry/boundary edges across many byte patterns.
for (let i = 0; i < 200; i++) {
  add(`random-${i}`, {
    amount: Number((rand() * 90000 + 0.01).toFixed(2)),
    iban: pick(IBANS),
    beneficiaryName: randText(MIXED, 1 + Math.floor(rand() * 70)),
    swift: pick(SWIFTS),
    currency: pick(CURRENCIES),
    date: pick(DATES),
    variableSymbol: digits(Math.floor(rand() * 11)),
    constantSymbol: digits(Math.floor(rand() * 5)),
    specificSymbol: digits(Math.floor(rand() * 11)),
    note: randText(MIXED, Math.floor(rand() * 141)),
    beneficiaryAddress1: randText(ASCII, Math.floor(rand() * 71)),
    beneficiaryAddress2: randText(MIXED, Math.floor(rand() * 71)),
  });
}

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'conformance-corpus.json');
const doc = {
  version: 1,
  description:
    'Differential conformance corpus. @paybysquare/core (TypeScript) is the ' +
    'golden encoder; every implementation must reproduce each payload ' +
    'byte-for-byte. Regenerate with spec/tools/generate_corpus.mjs.',
  entries,
};
writeFileSync(out, JSON.stringify(doc, null, 2) + '\n');
console.log(`wrote ${entries.length} corpus entries to ${out}`);
