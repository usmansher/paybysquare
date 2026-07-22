# Versioning and releases

Each published artifact versions **independently**, on its own SemVer line and
its own git tag namespace. There is no shared version number — a fix in one
package never forces a release of another.

| Artifact | Distribution | Release tag | Published as |
|---|---|---|---|
| `@paybysquare/core` | npm | `core-v<semver>` | that version (`release-npm.yml`) |
| `paybysquare/php` | Packagist | `php-v<semver>` | `v<semver>` in the split repo (`split.yml`) |
| `paybysquare/laravel` | Packagist | `laravel-v<semver>` | `v<semver>` in the split repo (`split.yml`) |
| `service/` | Docker / self-hosted (private) | — | not tag-released here |

The split workflow strips the package prefix, so a monorepo tag `php-v0.1.0`
becomes a clean `v0.1.0` tag in `paybysquare-php` — the form Packagist expects.

## Current versions

All published packages start at **0.1.0**. The *encoding contract* is stable
(pinned by `spec/SPEC.md`, the vectors, and the conformance corpus), but the
package **APIs** may still change before 1.0, so a `0.x` line is the honest
signal. `paybysquare/laravel` depends on `paybysquare/php` with `^0.1`.

Keep the three `0.x` lines moving together in spirit while the API settles;
they may diverge freely once each reaches 1.0.

## What triggers what

- **Push to `main`** — mirrors `packages/php` and `packages/laravel` to their
  split repos (so the Packagist repos track `main`). No release is cut.
- **Tag `core-v0.2.0`** — `release-npm.yml` builds, tests, and publishes
  `@paybysquare/core@0.2.0` to npm with provenance.
- **Tag `php-v0.2.0`** — `split.yml` releases only `paybysquare/php` as
  `v0.2.0`.
- **Tag `laravel-v0.2.0`** — `split.yml` releases only `paybysquare/laravel`
  as `v0.2.0`.

## Releasing (example)

```sh
# Bump the version in the package manifest first, then tag:
#   packages/core/package.json     -> "version": "0.2.0"
#   packages/php/composer.json     (Packagist reads the tag, not the manifest)
#   packages/laravel/composer.json (same)

git tag core-v0.2.0    && git push origin core-v0.2.0     # npm
git tag php-v0.2.0     && git push origin php-v0.2.0       # Packagist
git tag laravel-v0.2.0 && git push origin laravel-v0.2.0   # Packagist
```

Cross-language *behavior* changes still land in a single PR (spec + every
implementation, per [CONTRIBUTING.md](../CONTRIBUTING.md)); independent
versioning governs *releases*, not development.
