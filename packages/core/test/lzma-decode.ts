/**
 * In-language reference decoder for the Pay By Square payloads produced by
 * `src/lzma/encoder.ts`. It exists only for the test suite: it lets every
 * assertion round-trip an encoded payload back to its TSV data string without
 * depending on a Python/liblzma runtime.
 *
 * It is a genuine, independent LZMA1 *range decoder* (separate logic from the
 * range encoder), but it only handles the literal-only stream our encoder
 * emits (literals followed by the single end-of-stream marker). It is NOT a
 * general LZMA decoder — decoding streams that contain real matches (e.g.
 * liblzma's reference output) remains the job of `spec/tools/verify.py`.
 */
import { crc32 } from '../src/crc32.js';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUV';
const CHAR_TO_VALUE = new Map([...ALPHABET].map((c, i) => [c, i]));

const K_TOP = 1 << 24;
const BIT_MODEL_TOTAL = 2048;
const MOVE_BITS = 5;
const INIT_PROB = BIT_MODEL_TOTAL >> 1;
const LC = 3;
const POS_STATE_MASK = 3;
const NUM_STATES = 12;
const NUM_POS_SLOTS = 64;
const ALIGN_BITS = 4;
const END_POS_MODEL_INDEX = 14;
const EOS_DISTANCE = 0xffffffff;

function newProbs(size: number): Uint16Array {
  return new Uint16Array(size).fill(INIT_PROB);
}

class RangeDecoder {
  private code = 0;
  private range = 0xffffffff;
  private pos: number;

  constructor(private readonly data: Uint8Array) {
    // The first stream byte is the encoder's initial cache (always 0); skip it,
    // then load the 32-bit code from the next four bytes (big-endian).
    this.pos = 1;
    for (let i = 0; i < 4; i++) {
      this.code = ((this.code << 8) | this.nextByte()) >>> 0;
    }
  }

  private nextByte(): number {
    return this.data[this.pos++] ?? 0;
  }

  private normalize(): void {
    while (this.range < K_TOP) {
      this.range = (this.range << 8) >>> 0;
      this.code = ((this.code << 8) | this.nextByte()) >>> 0;
    }
  }

  decodeBit(probs: Uint16Array, index: number): number {
    const prob = probs[index]!;
    const bound = (this.range >>> 11) * prob;
    let bit: number;
    if ((this.code >>> 0) < bound) {
      this.range = bound;
      probs[index] = prob + ((BIT_MODEL_TOTAL - prob) >> MOVE_BITS);
      bit = 0;
    } else {
      this.code = (this.code - bound) >>> 0;
      this.range = (this.range - bound) >>> 0;
      probs[index] = prob - (prob >> MOVE_BITS);
      bit = 1;
    }
    this.normalize();
    return bit;
  }

  decodeDirectBits(numBits: number): number {
    let result = 0;
    for (let i = 0; i < numBits; i++) {
      this.range = this.range >>> 1;
      result <<= 1;
      if ((this.code >>> 0) >= this.range) {
        this.code = (this.code - this.range) >>> 0;
        result |= 1;
      }
      this.normalize();
    }
    return result >>> 0;
  }
}

function bitTreeDecode(
  rc: RangeDecoder,
  probs: Uint16Array,
  offset: number,
  numBits: number,
): number {
  let m = 1;
  for (let i = 0; i < numBits; i++) {
    m = (m << 1) | rc.decodeBit(probs, offset + m);
  }
  return m - (1 << numBits);
}

function reverseBitTreeDecode(
  rc: RangeDecoder,
  probs: Uint16Array,
  offset: number,
  numBits: number,
): number {
  let m = 1;
  let symbol = 0;
  for (let i = 0; i < numBits; i++) {
    const bit = rc.decodeBit(probs, offset + m);
    m = (m << 1) | bit;
    symbol |= bit << i;
  }
  return symbol;
}

/** Decompress a literal-only raw LZMA1 stream (lc=3, lp=0, pb=2). */
export function lzma1Decompress(
  compressed: Uint8Array,
  expectedLength: number,
): Uint8Array {
  const rc = new RangeDecoder(compressed);

  const isMatch = newProbs(NUM_STATES << 4);
  const isRep = newProbs(NUM_STATES);
  const posSlot = newProbs(4 * NUM_POS_SLOTS);
  const align = newProbs(1 << ALIGN_BITS);
  const lenChoice = newProbs(2);
  const lenLow = newProbs(16 * 8);
  const literals = newProbs((1 << LC) * 0x300);

  const state = 0;
  const out: number[] = [];
  let prevByte = 0;

  for (;;) {
    const posState = out.length & POS_STATE_MASK;
    if (rc.decodeBit(isMatch, (state << 4) + posState) === 0) {
      const litBase = (prevByte >>> (8 - LC)) * 0x300;
      let ctx = 1;
      for (let i = 0; i < 8; i++) {
        ctx = (ctx << 1) | rc.decodeBit(literals, litBase + ctx);
      }
      const byte = ctx & 0xff;
      out.push(byte);
      prevByte = byte;
      continue;
    }

    // Match: our encoder only emits the end-of-stream marker here.
    rc.decodeBit(isRep, state);
    rc.decodeBit(lenChoice, 0);
    bitTreeDecode(rc, lenLow, posState * 8, 3);

    const slot = bitTreeDecode(rc, posSlot, 0, 6);
    let dist: number;
    if (slot < 4) {
      dist = slot;
    } else {
      const footerBits = (slot >> 1) - 1;
      dist = (2 | (slot & 1)) * 2 ** footerBits;
      if (slot >= END_POS_MODEL_INDEX) {
        dist += rc.decodeDirectBits(footerBits - ALIGN_BITS) * (1 << ALIGN_BITS);
        dist += reverseBitTreeDecode(rc, align, 0, ALIGN_BITS);
      }
    }
    if ((dist >>> 0) === EOS_DISTANCE) {
      break;
    }
    throw new Error(`unexpected match distance ${dist >>> 0} in literal-only stream`);
  }

  if (out.length !== expectedLength) {
    throw new Error(
      `decompressed length ${out.length} != header length ${expectedLength}`,
    );
  }
  return Uint8Array.from(out);
}

function base32hexDecode(payload: string): Uint8Array {
  let bits = '';
  for (const ch of payload) {
    const value = CHAR_TO_VALUE.get(ch);
    if (value === undefined) {
      throw new Error(`invalid base32hex character "${ch}"`);
    }
    bits += value.toString(2).padStart(5, '0');
  }
  const byteCount = Math.floor(bits.length / 8);
  const out = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return out;
}

/**
 * Decode a full Pay By Square payload back to its TSV data string, mirroring
 * `spec/tools/verify.py`: base32hex-decode, unwrap the frame, LZMA-decompress,
 * check the length and CRC32, and return the recovered UTF-8 data.
 */
export function referenceDecode(payload: string): string {
  const raw = base32hexDecode(payload);
  if (raw.length < 4 || raw[0] !== 0 || raw[1] !== 0) {
    throw new Error('bad header: expected two leading zero bytes');
  }
  const totalLength = raw[2]! | (raw[3]! << 8);
  const total = lzma1Decompress(raw.subarray(4), totalLength);

  const checksum = total.subarray(0, 4);
  const data = total.subarray(4);
  const expected = crc32(data) >>> 0;
  const got =
    (checksum[0]! |
      (checksum[1]! << 8) |
      (checksum[2]! << 16) |
      (checksum[3]! << 24)) >>>
    0;
  if (expected !== got) {
    throw new Error('CRC32 mismatch');
  }
  return new TextDecoder().decode(data);
}
