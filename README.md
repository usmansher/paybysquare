# Pay By Square

[![CI](https://github.com/usmansher/paybysquare/actions/workflows/ci.yml/badge.svg)](https://github.com/usmansher/paybysquare/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40paybysquare%2Fcore)](https://www.npmjs.com/package/@paybysquare/core)
[![Packagist](https://img.shields.io/packagist/v/paybysquare/php)](https://packagist.org/packages/paybysquare/php)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An open-source, multi-language Pay By Square suite by usmansher: generate the
payload behind Slovak banking payment QR codes in TypeScript, PHP, Laravel, or
over HTTP — with the **same contract everywhere**. Every implementation is
verified in CI against the same shared test vectors and the same normative
reference verifier, so identical input produces an identically-decodable
payload in every language.

## Repository layout

| Path | What it is | Distribution |
|---|---|---|
| [`spec/`](spec/SPEC.md) | Normative encoding spec, shared test vectors, reference verifier, OpenAPI contract | — |
| [`packages/core`](packages/core) | TypeScript payload generator, zero runtime dependencies (Node, browsers, edge) | npm [`@paybysquare/core`](https://www.npmjs.com/package/@paybysquare/core) |
| [`packages/php`](packages/php) | Pure PHP (>= 8.2) payload generator, no extensions, no shell-outs | Packagist [`paybysquare/php`](https://packagist.org/packages/paybysquare/php) |
| [`packages/laravel`](packages/laravel) | Laravel integration: config defaults, facade, Blade QR component | Packagist [`paybysquare/laravel`](https://packagist.org/packages/paybysquare/laravel) |
| [`service/`](service) | Node/Fastify HTTP microservice with Docker image (private package) | Docker / self-hosted |

## Quickstart

### JavaScript / TypeScript (npm)

```bash
npm install @paybysquare/core qrcode
```

```ts
import { generatePayload } from '@paybysquare/core';
import QRCode from 'qrcode';

const payload = generatePayload({
  amount: 25.5,
  iban: 'SK7283300000009111111118',
  beneficiaryName: 'John Doe',
  swift: 'FIOZSKBAXXX',
  variableSymbol: '12345',
});

// Pair with any QR library, e.g. `qrcode`:
const dataUrl = await QRCode.toDataURL(payload);
```

`generatePayload` returns the text to put into the QR code; the library
deliberately has zero runtime dependencies and leaves QR rendering to you.
Invalid input throws a `ValidationError` with a `field` property.

### PHP (Composer)

```bash
composer require paybysquare/php
```

```php
use PayBySquare\PayBySquare;

$payload = PayBySquare::generatePayload([
    'amount' => 25.50,
    'iban' => 'SK7283300000009111111118',
    'beneficiaryName' => 'John Doe',
    'swift' => 'FIOZSKBAXXX',
    'variableSymbol' => '12345',
]);

// Render $payload with any QR library, e.g. bacon/bacon-qr-code.
```

Accepts a `PayBySquare\Payment` object or an array of the canonical
field names from [`spec/SPEC.md`](spec/SPEC.md).

### Laravel

```bash
composer require paybysquare/laravel bacon/bacon-qr-code
php artisan vendor:publish --tag=paybysquare-config
```

Set defaults (IBAN, SWIFT, currency, beneficiary name) in
`config/paybysquare.php` or via `PAYBYSQUARE_*` env vars, then:

```php
use PayBySquare\Laravel\Facades\PayBySquare;

$payload = PayBySquare::payload(['amount' => 25.50, 'variableSymbol' => '12345']);
$svg = PayBySquare::qrSvg(['amount' => 25.50], size: 256);
```

Or drop the Blade component straight into a view:

```blade
<x-paybysquare-qr :payment="['amount' => 25.50, 'variableSymbol' => '12345']" :size="256" />
```

### Hosted / self-hosted API

The Fastify service in [`service/`](service) exposes the generator over HTTP
(OpenAPI contract in [`spec/openapi.yaml`](spec/openapi.yaml), served at
`GET /v1/openapi.json`):

```bash
# Build from the repository root (the image needs packages/core and spec/openapi.yaml)
docker build -f service/Dockerfile -t paybysquare-service .
docker run --rm -p 8080:8080 -e AUTH_TOKEN=your-token paybysquare-service
```

```bash
curl -X POST "http://localhost:8080/v1/qr?format=png" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"amount": 25.50, "iban": "SK7283300000009111111118", "beneficiaryName": "John Doe"}' \
  --output qr.png
```

`POST /v1/payload` returns the raw payload as JSON; `POST /v1/qr` renders PNG
or SVG (`?format=svg`, `?size=...`). Auth is optional (the API is open when
`AUTH_TOKEN` is unset) and rate limiting defaults to 60 requests/minute.

## Specification and conformance

The byte-for-byte encoding contract lives in [`spec/SPEC.md`](spec/SPEC.md).
All implementations share [`spec/test-vectors.json`](spec/test-vectors.json)
and a large differential
[`spec/conformance-corpus.json`](spec/conformance-corpus.json): the TypeScript
core is the golden encoder, and every other implementation must reproduce each
payload byte-for-byte, so cross-language parity is enforced across the whole
input space in CI. Each package's test suite decodes its own output with an
in-language decoder (no runtime dependency), while
[`spec/tools/verify.py`](spec/tools/verify.py) (python3, stdlib only) is the
general liblzma decoder for verifying any payload, including scanned ones.

## Trademark

"PAY by square" is a payment standard of the Slovak Banking Association. This
project is an independent open-source implementation and is not affiliated
with, endorsed by, or sponsored by the Slovak Banking Association.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, the test-vector
contract, and PR conventions. For copy-paste recipes to generate payloads and
QR codes during development (every stack, shared dev parameters), see the
[development playbook](docs/DEV-PLAYBOOK.md).

## License

[MIT](LICENSE) © 2026 usmansher

