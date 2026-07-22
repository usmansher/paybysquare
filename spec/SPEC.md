# Pay By Square encoding — implementation spec

This document is the normative reference for every implementation in this
repository (`packages/core` TypeScript, `packages/php` PHP). It describes the
subset of the PAY by square standard (Slovak Banking Association) implemented
in v1: a **single simple payment order, encode-only**.

Reserved for future minor versions (data model must not preclude them):
standing orders, direct debits, multi-payment envelopes, payload decoding.

## 1. Input model

Canonical field names (camelCase; each language adapts casing idiomatically):

| Field | Required | Constraints |
|---|---|---|
| `amount` | yes | > 0, at most 2 decimal places |
| `iban` | yes | `^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$` after removing spaces |
| `beneficiaryName` | yes | non-empty after trimming |
| `currency` | no (default `EUR`) | 3 uppercase letters (ISO 4217) |
| `date` | no (default: today) | calendar date |
| `swift` | no | 8 or 11 chars when present |
| `variableSymbol` | no | digits, max 10 |
| `constantSymbol` | no | digits, max 4 |
| `specificSymbol` | no | digits, max 10 |
| `note` | no | max 140 chars |
| `beneficiaryAddress1` | no | max 70 chars |
| `beneficiaryAddress2` | no | max 70 chars |

Implementations MUST reject invalid input with a clear error; amounts with
more than 2 decimal places are rejected (not rounded) so that all languages
agree byte-for-byte without depending on float-rounding semantics.

## 2. Pipeline

```
input → TSV data string → UTF-8 bytes
      → CRC32(data) little-endian (4 bytes) + data        = total
      → raw LZMA1 compress (lc=3, lp=0, pb=2, dict=128KiB) = compressed
      → 0x00 0x00 + len(total) as uint16 LE + compressed   = framed
      → bits, zero-padded right to multiple of 5
      → each 5-bit group → char in "0123456789ABCDEFGHIJKLMNOPQRSTUV"
```

The 4-byte frame header is the By Square header:

| Byte | Meaning | v1 value |
|---|---|---|
| 0 | document type code | `0x00` (simple payment) |
| 1 | version | `0x00` |
| 2–3 | uncompressed length `len(total)`, uint16 LE | — |

`len(total)` MUST fit in 16 bits. v1 encodes only the simple payment order, so
the type code is always `0x00`; the byte is selected per document type (see
section 7) so future types are a data-model addition, not a breaking change.

## 3. TSV data string (normative, byte-for-byte)

Join the following 19 values with `\t` (0x09), in order:

```
1.  ""                     (attributes placeholder)
2.  "1"                    (number of payments)
3.  "1"                    (payment: simple payment order)
4.  amount, "%.2f"         (e.g. "10.00")
5.  currency               (e.g. "EUR")
6.  date as YYYYMMDD
7.  variableSymbol
8.  constantSymbol
9.  specificSymbol
10. ""                     (SEPA reference; symbols already given above)
11. note
12. "1"                    (to an account)
13. iban
14. swift
15. "0"                    (not recurring)
16. "0"                    (not a direct debit)
17. beneficiaryName
18. beneficiaryAddress1
19. beneficiaryAddress2
```

Every implementation MUST produce this string identically for identical input
(the `tsv` field of each test vector asserts this).

## 4. LZMA1 note — validity over byte-equality

LZMA compression is not canonical: different (valid) encoders emit different
bytes for the same input. Correctness is therefore asserted by **decoding**,
never by comparing against a single reference byte string.

The in-repo pure encoders emit a literal-only LZMA1 stream terminated by the
end-of-stream marker (dist = 0xFFFFFFFF). This is a valid stream, decodable by
any conforming LZMA decoder; measured against the vectors it is 7–18% larger
than liblzma's output (~135–226 payload characters vs ~114–212), which costs
at most one QR version. Match finding is a permitted future optimization — a
decode round-trip, not byte equality, is the contract.

## 5. Verification model

Two layers of decoder are used, split by responsibility:

- **In-language decoders (per-language test suites).** Because the in-repo
  encoders are literal-only, each implementation ships a small literal-only
  LZMA1 *decoder* used only by its tests (`packages/core/test/lzma-decode.ts`,
  `packages/php/tests/Lzma1Decoder.php`). Every suite round-trips its own
  output back to the TSV with no external runtime, so the packages test
  standalone (including in the subtree-split Packagist repos).
- **`spec/tools/verify.py` (general decoder).** A full liblzma-backed decoder
  that also handles streams with real matches. It is the CLI tool for
  verifying any payload (including scanned ones) and backs the spec self-check;
  it is the reference a match-finding encoder would be validated against.

## 6. Shared artifacts

`spec/test-vectors.json` — a handful of curated vectors. Regenerate with
`python spec/tools/generate_vectors.py` (requires the `pay_by_square` PyPI
package). Each vector's `payloadReference` is **informative** (one valid
liblzma encoding).

`spec/conformance-corpus.json` — a large, diverse differential corpus.
`@paybysquare/core` (TypeScript) is the **golden encoder**: it produces each
entry's `payload`. Regenerate with `node spec/tools/generate_corpus.mjs` after
any intentional encoding change. Because both in-repo encoders are
deterministic and literal-only, every implementation MUST reproduce each
`payload` byte-for-byte — this is what enforces cross-language parity across
the whole input space rather than a few examples.

Every implementation's CI MUST, for each vector and corpus entry:

1. Build the TSV from `input` and assert equality with `tsv`.
2. Encode `input` and assert the payload decodes (via the in-language decoder)
   back to `tsv`; for corpus entries, also assert the payload equals the golden
   `payload` byte-for-byte.

The language-neutral `spec/tools/selfcheck.py` owns the checks that need a
general decoder: that every `payloadReference` and every golden `payload`
decodes to its `tsv` via liblzma. Both artifacts have a single canonical copy
here under `spec/`; the subtree-split workflow injects them into the split
package at split time so its tests run standalone, keeping the monorepo free of
duplicated fixtures.

## 7. Document types (extension point)

The PAY by square standard defines several document types (simple payment,
standing order, direct debit, and multi-payment envelopes). v1 of this suite
implements only the **simple payment order** (type code `0x00`), but the data
model does not preclude the others:

- The frame header's first byte is the document **type code** (section 2),
  selected per type rather than hardcoded.
- Each implementation resolves the type through a small registry that pairs the
  type code with the data-string builder for that document
  (`packages/core/src/document.ts`, `PayBySquare::DOCUMENT_TYPE_CODES`), and
  `generatePayload` takes an optional `documentType` argument that defaults to
  `payment`.

Adding a type is therefore additive: register its type code and TSV builder,
extend the input model, and add vectors/corpus entries — no change to the frame
format, the pipeline, or the existing `payment` output.
