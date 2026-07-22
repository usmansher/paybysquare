# @paybysquare/core — Storybook demo

An interactive [Storybook](https://storybook.js.org/) that runs
[`@paybysquare/core`](../../packages/core) **entirely in the browser**: the
`<PayBySquareQr>` component calls `generatePayload()` on the zero-dependency ESM
build and renders the payload as a live QR code. It doubles as a visual test
environment for the encoder — edit any field in the Storybook controls and the
payload and QR update instantly; invalid input shows the encoder's
`ValidationError` inline.

## Run locally

```sh
# Build the core library first (this demo depends on it via file:).
cd ../../packages/core && npm ci && npm run build

cd ../../examples/storybook
npm install
npm run storybook        # http://localhost:6006
```

## Build the static site

```sh
npm run build-storybook  # outputs ./storybook-static
```

## Deploy to GitHub Pages

The repo ships `.github/workflows/pages.yml`, a **manual** (`workflow_dispatch`)
GitHub Pages deploy. To publish:

1. In the repo settings, set **Pages → Build and deployment → Source** to
   *GitHub Actions*.
2. Run the **Storybook Pages** workflow from the Actions tab.

The workflow builds `@paybysquare/core`, then builds this Storybook with
`SB_BASE=/paybysquare/` (the project-site sub-path) and deploys
`storybook-static`.
