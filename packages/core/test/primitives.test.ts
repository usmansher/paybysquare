import assert from 'node:assert/strict';
import { test } from 'node:test';

import { crc32 } from '../src/crc32.js';
import { base32hexEncode } from '../src/base32hex.js';

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

test('crc32 matches the standard CRC-32/ISO-HDLC check value', () => {
  // "123456789" => 0xCBF43926 is the canonical CRC-32 check value.
  assert.equal(crc32(utf8('123456789')), 0xcbf43926);
});

test('crc32 of empty input is 0', () => {
  assert.equal(crc32(new Uint8Array(0)), 0);
});

test('crc32 always returns an unsigned 32-bit integer', () => {
  const crc = crc32(utf8('The quick brown fox jumps over the lazy dog'));
  assert.ok(crc >= 0 && crc <= 0xffffffff);
  assert.equal(crc, 0x414fa339);
});

test('base32hexEncode of empty input is empty', () => {
  assert.equal(base32hexEncode(new Uint8Array(0)), '');
});

test('base32hexEncode packs bytes into 5-bit groups (no padding char)', () => {
  // 0xFF = 11111111 -> 11111 (V) then 111 left-padded on the right -> 11100 (S).
  assert.equal(base32hexEncode(new Uint8Array([0xff])), 'VS');
  // Two bytes 0x00 0x00 -> 16 bits -> "0000" (16/5 rounds up to 4 chars).
  assert.equal(base32hexEncode(new Uint8Array([0x00, 0x00])), '0000');
});

test('base32hexEncode output is confined to the alphabet', () => {
  const bytes = new Uint8Array(64);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = (i * 37) & 0xff;
  }
  assert.match(base32hexEncode(bytes), /^[0-9A-V]+$/);
});
