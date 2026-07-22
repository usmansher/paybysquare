# Security Policy

## Supported versions

Only the latest released version of each package receives security fixes:

| Package | Supported |
|---|---|
| `@paybysquare/core` (npm) | latest 0.x release |
| `paybysquare/php` (Packagist) | latest 0.x release |
| `paybysquare/laravel` (Packagist) | latest 0.x release |
| `service/` | latest `main` |

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Instead, use
GitHub's private vulnerability reporting:

**[Report a vulnerability](https://github.com/usmansher/paybysquare/security/advisories/new)**

You can expect an acknowledgement within a few days. Please include a
minimal reproduction (input, expected vs. actual behaviour) where possible.

## Scope notes

- The libraries generate QR payload *strings*; they perform no network I/O
  and hold no secrets. The main security-relevant surface is input
  validation and the byte-level encoding contract (`spec/SPEC.md`).
- The HTTP service (`service/`) additionally exposes authentication
  (`AUTH_TOKEN` bearer) and rate limiting; misconfiguration reports are
  welcome, but deployments themselves are the operator's responsibility.
