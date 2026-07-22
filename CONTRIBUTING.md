# Contributing

Thanks for contributing to the Pay By Square suite. This is a monorepo with
multiple implementations of one encoding contract — read
[`spec/SPEC.md`](spec/SPEC.md) before touching any encoder.

## Prerequisites

- Node.js 22 (>= 18 works) and npm
- PHP >= 8.2 and Composer
- python3 (stdlib only) — **not** needed to run the package test suites (they
  use in-language decoders). Only needed for the `spec-selfcheck` CI job,
  regenerating vectors, and the `verify.py` CLI tool.

## Dev setup per package

### packages/core (TypeScript, npm `@paybysquare/core`)

```sh
cd packages/core
npm install
npm test          # compiles and runs node --test against the shared vectors
npm run build     # emits dist/
```

Zero runtime dependencies is a hard constraint — do not add any.

### packages/php (Packagist `paybysquare/php`)

```sh
cd packages/php
composer install
composer test
```

Pure PHP >= 8.2: no extensions, no shell-outs. The suite decodes payloads with
an in-language decoder (`tests/Lzma1Decoder.php`) and runs standalone.

### packages/laravel (Packagist `paybysquare/laravel`)

```sh
cd packages/laravel
composer install   # pulls paybysquare/php from ../php via a path repository
composer test
```

### service/ (Fastify HTTP service)

The service depends on `packages/core` via `file:`, so build core first:

```sh
cd packages/core && npm install && npm run build
cd ../../service && npm install
npm test
```

Docker image (build from the repository root — the image needs
`packages/core` and `spec/openapi.yaml`):

```sh
docker build -f service/Dockerfile -t paybysquare-service .
```

## The conformance contract

This is what keeps every implementation byte-compatible. Non-negotiable rules:

1. **Never edit `spec/test-vectors.json` or `spec/conformance-corpus.json` by
   hand.** Regenerate vectors with `python spec/tools/generate_vectors.py`
   (requires the `pay_by_square` PyPI package) and the corpus with
   `node spec/tools/generate_corpus.mjs` (after `npm run build` in
   `packages/core`). A change to either is a spec change and must be reflected
   in `spec/SPEC.md` in the same PR.
2. **Cross-language parity is enforced by the corpus.** `@paybysquare/core` is
   the golden encoder; every implementation must reproduce each corpus
   `payload` byte-for-byte, and each suite decodes its own output back to the
   `tsv` with its in-language decoder. The `spec-selfcheck` CI job decodes
   every payload via liblzma as an independent oracle.
3. **Single canonical copy.** The vectors and corpus live only under `spec/`.
   The subtree-split workflow injects them into the php package at split time
   (`tests/fixtures/`, git-ignored) so the split repo tests standalone — there
   are no copies to keep in sync in the monorepo.
4. **Validity over byte-equality against liblzma.** LZMA output is not
   canonical, so a vector's `payloadReference` is informative only; parity is
   between our own implementations plus a decode round-trip (see
   `spec/SPEC.md` sections 4–6).
5. Adding a field or behavior to one implementation means adding it to all of
   them, plus vector/corpus and spec coverage.

## Versioning and releases

Each published package versions independently under its own tag namespace
(`core-v*`, `php-v*`, `laravel-v*`); see [docs/VERSIONING.md](docs/VERSIONING.md).
A push to `main` mirrors the Composer packages to their split repos without
cutting a release.

## Commit format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`.
Scope by package where it helps, e.g. `feat(php): ...`, `fix(core): ...`,
`ci: ...`.

## Pull requests

- Branch from `main`; keep PRs focused on one change.
- All CI jobs must pass (`.github/workflows/ci.yml`): core, php, laravel,
  service (incl. Docker build), spec self-check (liblzma), and OpenAPI lint.
- Cross-implementation changes ship in one PR with vectors + spec updated
  together, so CI proves all implementations still agree.
- Include tests for every behavior change; do not weaken or delete tests to
  make them pass.
- Update the relevant README(s) when public APIs or HTTP endpoints change,
  and `spec/openapi.yaml` when the service contract changes.
- Describe *what* changed and *why* in the PR body, with repro steps for bug
  fixes.
