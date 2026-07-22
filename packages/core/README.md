# @paybysquare/core

Pay By Square payload generator — the Slovak Banking Association's payment QR
standard. **Zero runtime dependencies**; pure TypeScript that runs in Node,
browsers, and edge runtimes (no native modules, no WASM).

Part of the [paybysquare/php](https://github.com/usmansher/paybysquare)
multi-language suite: the same contract is implemented in PHP
(`paybysquare/php` on Packagist, with a Laravel integration) and served by a
hosted/self-hostable HTTP API — all verified against one shared set of test
vectors.

## Install

```sh
npm install @paybysquare/core
```

## Usage

```ts
import { generatePayload } from '@paybysquare/core';

const payload = generatePayload({
  amount: 25.5,
  iban: 'SK7283300000009111111118',
  swift: 'FIOZSKBAXXX',
  variableSymbol: '2026001',
  beneficiaryName: 'Acme s.r.o.',
  note: 'Invoice FA20260103',
});
// payload is the string to put into a QR code
```

Pair it with any QR library, e.g. [`qrcode`](https://www.npmjs.com/package/qrcode):

```ts
import QRCode from 'qrcode';

const dataUrl = await QRCode.toDataURL(generatePayload(payment));
```

### Input

| Field | Required | Notes |
|---|---|---|
| `amount` | yes | positive, max 2 decimal places (not rounded — rejected) |
| `iban` | yes | spaces allowed, case-insensitive |
| `beneficiaryName` | yes | non-empty |
| `currency` | no | ISO 4217, default `EUR` |
| `date` | no | `Date` or `'YYYY-MM-DD'`, default today |
| `swift` | no | 8 or 11 characters |
| `variableSymbol` / `specificSymbol` | no | up to 10 digits |
| `constantSymbol` | no | up to 4 digits |
| `note` | no | up to 140 characters |
| `beneficiaryAddress1` / `2` | no | up to 70 characters |

Invalid input throws `ValidationError` with a `field` property naming the
offending field.

## Correctness

Every release passes the shared
[test vectors](https://github.com/usmansher/paybysquare/blob/main/spec/test-vectors.json):
payloads are decoded by an independent liblzma-based reference verifier and the
recovered data must match the spec byte-for-byte. The LZMA stream this package
emits is literal-coded — roughly 10–20% longer than liblzma's output (at most
one QR version larger; scannability is unaffected) — and decodable by any
conforming LZMA decoder.

## Trademark note

PAY by square is a payment standard of the Slovak Banking Association. This is
an independent open-source implementation, not affiliated with or endorsed by
the SBA or Bysquare.

## License

MIT © usmansher
