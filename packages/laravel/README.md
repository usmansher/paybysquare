# paybysquare/laravel

Laravel integration for [`paybysquare/php`](../php), the Pay By Square
(Slovak payment QR standard) payload generator. Provides config-driven
defaults, a facade, and a Blade component for rendering QR codes as inline SVG.

## Requirements

- PHP >= 8.2
- Laravel 11, 12, or 13

## Installation

```bash
composer require paybysquare/laravel
```

The service provider is auto-discovered.

SVG rendering (the `qrSvg()` method and the Blade component) additionally
requires [bacon/bacon-qr-code](https://github.com/Bacon/BaconQrCode):

```bash
composer require bacon/bacon-qr-code
```

If you only generate payload strings (e.g. to feed a front-end QR library),
you do not need it.

## Configuration

Publish the config file:

```bash
php artisan vendor:publish --tag=paybysquare-config
```

`config/paybysquare.php` defines defaults applied when the caller omits them:

| Key                | Env variable                   | Default |
| ------------------ | ------------------------------ | ------- |
| `currency`         | `PAYBYSQUARE_CURRENCY`         | `EUR`   |
| `iban`             | `PAYBYSQUARE_IBAN`             | `null`  |
| `swift`            | `PAYBYSQUARE_SWIFT`            | `''`    |
| `beneficiary_name` | `PAYBYSQUARE_BENEFICIARY_NAME` | `null`  |

With `iban` and `beneficiary_name` configured, generating a payment payload
only needs an amount.

## Usage

### Facade

```php
use PayBySquare\Laravel\Facades\PayBySquare;

// Payload string to feed into any QR code renderer:
$payload = PayBySquare::payload([
    'amount' => 12.34,
    'iban' => 'SK7700000000000000000000',
    'beneficiaryName' => 'Example s.r.o.',
    'variableSymbol' => '123',
]);

// Inline SVG QR code (requires bacon/bacon-qr-code):
$svg = PayBySquare::qrSvg(['amount' => 12.34], size: 200);
```

`payload()` and `qrSvg()` also accept a `PayBySquare\Payment` instance.
Config defaults are only merged into array input; invalid input throws
`PayBySquare\ValidationException` (its `field` property names the
offending key).

### Blade component

```blade
<x-paybysquare-qr :payment="['amount' => 12.34, 'variableSymbol' => '123']" :size="200" />
```

Outputs the QR code as inline SVG. Requires bacon/bacon-qr-code.

## Testing

```bash
composer install
composer test
```

## License

MIT
