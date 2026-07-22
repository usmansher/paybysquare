import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lzma1Compress } from '../src/lzma/encoder.js';
import { lzma1Decompress } from './lzma-decode.js';

const cases: Array<[string, Uint8Array]> = [
  ['empty input', new Uint8Array(0)],
  ['single byte', Uint8Array.from([0x41])],
  ['ascii text', new TextEncoder().encode('hello pay by square')],
  ['utf-8 diacritics', new TextEncoder().encode('Žltá ľalia — úhrada č. 47')],
  ['all byte values', Uint8Array.from({ length: 256 }, (_, i) => i)],
  [
    'repetitive data',
    new TextEncoder().encode('\t'.repeat(50) + 'AAAA'.repeat(100)),
  ],
  [
    'pseudorandom bytes',
    Uint8Array.from({ length: 1000 }, (_, i) => (i * 2654435761) % 256),
  ],
];

for (const [name, input] of cases) {
  test(`lzma1 round-trip: ${name}`, () => {
    const compressed = lzma1Compress(input);
    const restored = lzma1Decompress(compressed, input.length);
    assert.deepEqual(restored, input);
  });
}
