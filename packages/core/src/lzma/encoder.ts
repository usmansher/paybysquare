/**
 * Minimal raw LZMA1 encoder for Pay By Square payloads.
 *
 * Emits a literal-only stream (no match finding) terminated by the
 * end-of-stream marker, using the fixed Pay By Square parameters
 * lc=3, lp=0, pb=2. Any conforming LZMA decoder accepts the output;
 * see spec/SPEC.md section 4 for why validity, not byte-equality with
 * liblzma, is the contract. Match finding is a future optimization.
 */

const K_TOP = 1 << 24;
const BIT_MODEL_TOTAL = 2048;
const MOVE_BITS = 5;
const INIT_PROB = BIT_MODEL_TOTAL >> 1;

const LC = 3;
const PB = 2;
const POS_STATE_MASK = (1 << PB) - 1;
const NUM_STATES = 12;
const NUM_POS_SLOTS = 64;
const ALIGN_BITS = 4;
const END_POS_MODEL_INDEX = 14;
const EOS_DISTANCE = 0xffffffff;

class RangeEncoder {
  private low = 0;
  private range = 0xffffffff;
  private cache = 0;
  private cacheSize = 1;
  private readonly out: number[] = [];

  encodeBit(probs: Uint16Array, index: number, bit: number): void {
    const prob = probs[index]!;
    const bound = (this.range >>> 11) * prob;
    if (bit === 0) {
      this.range = bound;
      probs[index] = prob + ((BIT_MODEL_TOTAL - prob) >> MOVE_BITS);
    } else {
      this.low += bound;
      this.range -= bound;
      probs[index] = prob - (prob >> MOVE_BITS);
    }
    while (this.range < K_TOP) {
      this.range = (this.range << 8) >>> 0;
      this.shiftLow();
    }
  }

  encodeDirectBits(value: number, numBits: number): void {
    for (let i = numBits - 1; i >= 0; i--) {
      this.range = this.range >>> 1;
      if ((value >>> i) & 1) {
        this.low += this.range;
      }
      if (this.range < K_TOP) {
        this.range = (this.range << 8) >>> 0;
        this.shiftLow();
      }
    }
  }

  flush(): Uint8Array {
    for (let i = 0; i < 5; i++) {
      this.shiftLow();
    }
    return Uint8Array.from(this.out);
  }

  private shiftLow(): void {
    const carry = Math.floor(this.low / 0x100000000);
    if (carry !== 0 || this.low < 0xff000000) {
      let temp = this.cache;
      do {
        this.out.push((temp + carry) & 0xff);
        temp = 0xff;
      } while (--this.cacheSize !== 0);
      this.cache = (this.low >>> 24) & 0xff;
    }
    this.cacheSize++;
    this.low = (this.low & 0x00ffffff) * 256;
  }
}

function newProbs(size: number): Uint16Array {
  return new Uint16Array(size).fill(INIT_PROB);
}

function bitTreeEncode(
  rc: RangeEncoder,
  probs: Uint16Array,
  offset: number,
  numBits: number,
  symbol: number,
): void {
  let m = 1;
  for (let i = numBits - 1; i >= 0; i--) {
    const bit = (symbol >>> i) & 1;
    rc.encodeBit(probs, offset + m, bit);
    m = (m << 1) | bit;
  }
}

function reverseBitTreeEncode(
  rc: RangeEncoder,
  probs: Uint16Array,
  offset: number,
  numBits: number,
  symbol: number,
): void {
  let m = 1;
  for (let i = 0; i < numBits; i++) {
    const bit = symbol & 1;
    symbol >>>= 1;
    rc.encodeBit(probs, offset + m, bit);
    m = (m << 1) | bit;
  }
}

/** Compress `data` into a raw LZMA1 stream (lc=3, lp=0, pb=2) with EOS marker. */
export function lzma1Compress(data: Uint8Array): Uint8Array {
  const rc = new RangeEncoder();

  const isMatch = newProbs(NUM_STATES << 4);
  const isRep = newProbs(NUM_STATES);
  const posSlot = newProbs(4 * NUM_POS_SLOTS);
  const align = newProbs(1 << ALIGN_BITS);
  const lenChoice = newProbs(2);
  const lenLow = newProbs(16 * 8);
  const literals = newProbs((1 << LC) * 0x300);

  // Only literals are emitted, so the LZMA state machine stays in state 0
  // throughout (literal after literal from the initial state remains 0).
  const state = 0;
  let prevByte = 0;

  for (let pos = 0; pos < data.length; pos++) {
    const posState = pos & POS_STATE_MASK;
    rc.encodeBit(isMatch, (state << 4) + posState, 0);

    const symbol = data[pos]!;
    const litBase = (prevByte >>> (8 - LC)) * 0x300;
    let ctx = 1;
    for (let i = 7; i >= 0; i--) {
      const bit = (symbol >>> i) & 1;
      rc.encodeBit(literals, litBase + ctx, bit);
      ctx = (ctx << 1) | bit;
    }
    prevByte = symbol;
  }

  // End-of-stream marker: a simple match of minimum length with the
  // reserved distance 0xFFFFFFFF.
  const posState = data.length & POS_STATE_MASK;
  rc.encodeBit(isMatch, (state << 4) + posState, 1);
  rc.encodeBit(isRep, state, 0);

  // Match length = MATCH_MIN_LEN → choice bit 0, low coder symbol 0.
  rc.encodeBit(lenChoice, 0, 0);
  bitTreeEncode(rc, lenLow, posState * 8, 3, 0);

  // Distance = 0xFFFFFFFF → pos slot 63.
  const lenToPosState = 0; // min(length - MATCH_MIN_LEN, 3) with length = MATCH_MIN_LEN
  const slot = 63;
  bitTreeEncode(rc, posSlot, lenToPosState * NUM_POS_SLOTS, 6, slot);

  const footerBits = (slot >> 1) - 1; // 30
  const base = (2 | (slot & 1)) * 2 ** footerBits; // 0xC0000000
  const reduced = EOS_DISTANCE - base; // 0x3FFFFFFF
  if (slot >= END_POS_MODEL_INDEX) {
    rc.encodeDirectBits(Math.floor(reduced / (1 << ALIGN_BITS)), footerBits - ALIGN_BITS);
    reverseBitTreeEncode(rc, align, 0, ALIGN_BITS, reduced & ((1 << ALIGN_BITS) - 1));
  }

  return rc.flush();
}
