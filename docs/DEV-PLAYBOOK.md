# Development playbook

Copy-paste recipes for generating Pay By Square payloads and QR codes while
developing. All recipes use the same safe development parameters, so results
are comparable across every stack in this repo.

## Development parameters

| Parameter | Dev value | Notes |
|---|---|---|
| `amount` | `25.50` | positive, max 2 decimals (3+ decimals are rejected) |
| `iban` | `SK7283300000009111111118` | test IBAN used across all test vectors |
| `beneficiaryName` | `John Doe` | required everywhere |
| `swift` | `FIOZSKBAXXX` | optional |
| `variableSymbol` | `2026001` | optional, digits, max 10 |
| `constantSymbol` | `0308` | optional, digits, max 4 |
| `specificSymbol` | `99` | optional, digits, max 10 |
| `note` | `Invoice FA20260103` | optional, max 140 chars |
| `date` | `2026-07-21` | optional `YYYY-MM-DD`; **pin it in dev** so output is reproducible — omitting it uses today's date and changes the payload daily |
| `currency` | `EUR` | optional, default |

Diacritics smoke value: `beneficiaryName: "Žltá ľalia, s.r.o."` — exercises
UTF-8 handling end to end.

## Recipe 1 — payload from the npm package

```sh
cd packages/core && npm run build
node -e "
import('./dist/index.js').then(({ generatePayload }) => {
  console.log(generatePayload({
    amount: 25.5,
    iban: 'SK7283300000009111111118',
    beneficiaryName: 'John Doe',
    swift: 'FIOZSKBAXXX',
    variableSymbol: '2026001',
    note: 'Invoice FA20260103',
    date: '2026-07-21',
  }));
});"
```

QR PNG on disk (uses the service's `qrcode` dependency):

```sh
cd service
node -e "
Promise.all([import('@paybysquare/core'), import('qrcode')]).then(
  ([{ generatePayload }, QRCode]) =>
    QRCode.default.toFile('/tmp/dev-qr.png', generatePayload({
      amount: 25.5,
      iban: 'SK7283300000009111111118',
      beneficiaryName: 'John Doe',
      date: '2026-07-21',
    })),
);"
open /tmp/dev-qr.png
```

## Recipe 2 — payload from the PHP package

```sh
cd packages/php && composer install
php -r "
require 'vendor/autoload.php';
echo PayBySquare\PayBySquare::generatePayload([
    'amount' => 25.50,
    'iban' => 'SK7283300000009111111118',
    'beneficiaryName' => 'John Doe',
    'swift' => 'FIOZSKBAXXX',
    'variableSymbol' => '2026001',
    'note' => 'Invoice FA20260103',
    'date' => '2026-07-21',
]) . PHP_EOL;"
```

## Recipe 3 — inside a Laravel app (tinker)

```sh
php artisan tinker
```

```php
use PayBySquare\Laravel\Facades\PayBySquare;

// Payload only
PayBySquare::payload(['amount' => 25.50, 'iban' => 'SK7283300000009111111118',
    'beneficiaryName' => 'John Doe', 'date' => '2026-07-21']);

// With config defaults (set PAYBYSQUARE_IBAN / PAYBYSQUARE_BENEFICIARY_NAME
// in .env first) only the varying fields are needed:
PayBySquare::payload(['amount' => 25.50, 'variableSymbol' => '2026001']);

// Inline SVG
PayBySquare::qrSvg(['amount' => 25.50, 'iban' => 'SK7283300000009111111118',
    'beneficiaryName' => 'John Doe'], size: 256);
```

Blade:

```blade
<x-paybysquare-qr :payment="['amount' => 25.50, 'variableSymbol' => '2026001']" :size="256" />
```

## Recipe 4 — the HTTP service and interactive playground

Start the service (auth off, rate limit relaxed for dev), then open
<http://localhost:8080/> in a browser: the **playground** is a live form with
every parameter from the table above prefilled — edit a field and the QR code,
payload, and a ready-to-copy `curl` command regenerate instantly through the
real `/v1` endpoints, with validation errors shown inline. PNG/SVG downloads
included. This is the fastest way to play with parameters during development.

```sh
cd packages/core && npm run build && cd ../../service
npm install && npm run build
PORT=8080 RATE_LIMIT=600 npm start
```

Payload:

```sh
curl -s -X POST http://localhost:8080/v1/payload \
  -H 'Content-Type: application/json' \
  -d '{"amount": 25.50, "iban": "SK7283300000009111111118",
       "beneficiaryName": "John Doe", "date": "2026-07-21"}'
```

PNG / SVG:

```sh
curl -s -X POST 'http://localhost:8080/v1/qr?format=png&size=512' \
  -H 'Content-Type: application/json' \
  -d '{"amount": 25.50, "iban": "SK7283300000009111111118", "beneficiaryName": "John Doe"}' \
  --output /tmp/dev-qr.png

curl -s -X POST 'http://localhost:8080/v1/qr?format=svg' \
  -H 'Content-Type: application/json' \
  -d '{"amount": 25.50, "iban": "SK7283300000009111111118", "beneficiaryName": "John Doe"}'
```

With auth enabled (`AUTH_TOKEN=dev-token npm start`), add
`-H 'Authorization: Bearer dev-token'`. The contract is at
`http://localhost:8080/v1/openapi.json`.

Docker instead of npm:

```sh
docker build -f service/Dockerfile -t paybysquare-service .
docker run -p 8080:8080 -e RATE_LIMIT=600 paybysquare-service
```

## Recipe 5 — verify any payload

The normative decoder proves a payload is well-formed and shows the encoded
data (works on payloads from any implementation, including scanned ones):

```sh
python3 spec/tools/verify.py '<payload string>'
```

Output is the tab-separated data; a non-zero exit means malformed payload.

## Recipe 6 — regenerate the shared vectors and corpus

Only needed when the spec changes; never edit the JSON artifacts by hand.

```sh
# Curated vectors (needs the pay_by_square PyPI package).
python3 -m venv /tmp/pbs-venv && /tmp/pbs-venv/bin/pip install pay_by_square
/tmp/pbs-venv/bin/python spec/tools/generate_vectors.py

# Differential corpus (golden = the TypeScript core; deterministic).
cd packages/core && npm run build && cd ../..
node spec/tools/generate_corpus.mjs

# Independent liblzma oracle over both artifacts.
python3 spec/tools/selfcheck.py
```

Both artifacts have a single canonical copy under `spec/`; the split workflow
injects them into the php package at split time, so there is nothing to
re-vendor by hand.

Then run every suite — all implementations must reproduce the corpus payloads
byte-for-byte (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

## Troubleshooting

- **`ValidationError` / `ValidationException`** — the `field` property names
  the offending input; the dev values above always pass.
- **Different payload every day** — you omitted `date`; pin it.
- **Two implementations produce different payloads for the same input** —
  expected: LZMA output is not canonical. Both must decode identically via
  Recipe 5; byte-equality is not the contract (see spec/SPEC.md §4).
- **Service returns 401** — `AUTH_TOKEN` is set; pass the bearer header or
  unset it.
