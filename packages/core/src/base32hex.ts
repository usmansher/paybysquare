const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUV';

/**
 * Pack bytes into the Pay By Square character encoding: the bit stream is
 * zero-padded on the right to a multiple of 5 and each 5-bit group maps to
 * one character of the base32hex alphabet (no `=` padding).
 */
export function base32hexEncode(data: Uint8Array): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < data.length; i++) {
    buffer = (buffer << 8) | data[i]!;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(buffer >>> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    out += ALPHABET[(buffer << (5 - bits)) & 0x1f];
  }
  return out;
}
