# paybysquare/php

Pay By Square payload generator for PHP — the Slovak Banking Association's
payment QR standard. **Pure PHP ≥ 8.2**: no extensions, no shell-outs, installs
on any shared host.

Part of the [paybysquare/php](https://github.com/usmansher/paybysquare)
multi-language suite: the same contract is implemented in TypeScript
(`@paybysquare/core` on npm) and served by a hosted/self-hostable HTTP API —
all verified against one shared set of test vectors. Using Laravel? See
[`paybysquare/laravel`](https://packagist.org/packages/paybysquare/laravel)
for a facade, config defaults, and a Blade QR component.

## Install

```sh
composer require paybysquare/php
```

## Usage

```php
use PayBySquare\Payment;
use PayBySquare\PayBySquare;

$payload = PayBySquare::generatePayload(new Payment(
    amount: 25.50,
    iban: 'SK7283300000009111111118',
    beneficiaryName: 'Acme s.r.o.',
    swift: 'FIOZSKBAXXX',
    variableSymbol: '2026001',
    note: 'Invoice FA20260103',
));
// $payload is the string to put into a QR code
```

Array input works too (canonical camelCase keys):

```php
$payload = PayBySquare::generatePayload([
    'amount' => 25.50,
    'iban' => 'SK7283300000009111111118',
    'beneficiaryName' => 'Acme s.r.o.',
]);
```

Render with any QR library, e.g.
[bacon/bacon-qr-code](https://packagist.org/packages/bacon/bacon-qr-code):

```php
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;

$writer = new Writer(new ImageRenderer(new RendererStyle(256), new SvgImageBackEnd()));
$svg = $writer->writeString($payload);
```

### Input

`amount`, `iban` and `beneficiaryName` are required; `currency` (default
`EUR`), `date` (`DateTimeInterface` or `YYYY-MM-DD`, default today), `swift`,
`variableSymbol`, `constantSymbol`, `specificSymbol`, `note`,
`beneficiaryAddress1/2` are optional. Invalid input throws
`PayBySquare\ValidationException` with a public `$field` property.
Amounts with more than 2 decimal places are rejected, not rounded.

## Correctness

Every release passes the shared
[test vectors](https://github.com/usmansher/paybysquare/blob/main/spec/test-vectors.json):
payloads are decoded by an independent liblzma-based reference verifier and the
recovered data must match the spec byte-for-byte. The emitted LZMA stream is
literal-coded — roughly 10–20% longer than liblzma's output (at most one QR
version larger; scannability is unaffected) — and decodable by any conforming
LZMA decoder.

## Trademark note

PAY by square is a payment standard of the Slovak Banking Association. This is
an independent open-source implementation, not affiliated with or endorsed by
the SBA or Bysquare.

## License

MIT © usmansher
