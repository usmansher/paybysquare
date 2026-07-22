# @paybysquare/service

Fastify microservice around [`@paybysquare/core`](../packages/core) that
generates PAY by square payload strings and QR code images. The HTTP contract
lives in [`spec/openapi.yaml`](../spec/openapi.yaml) and is served at
`GET /v1/openapi.json`.

## Run locally

Requires Node 22 (>= 18 works). The core library must be built first — the
service depends on it via `file:../packages/core`.

```sh
cd packages/core && npm install && npm run build
cd ../../service && npm install && npm run build
npm start
```

Then open <http://localhost:8080/> — the interactive **playground**: a form
with all payment parameters that renders the QR code and payload live through
the real `/v1` endpoints, with validation errors inline, PNG/SVG downloads,
and a copyable `curl` command for the current parameters. Disable it in
production with `PLAYGROUND=false`.

Run the tests with:

```sh
npm test
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | HTTP listen port. |
| `AUTH_TOKEN` | unset | When set, every POST endpoint requires `Authorization: Bearer <AUTH_TOKEN>` and answers 401 otherwise. When unset, the API is open. |
| `RATE_LIMIT` | `60` | Max requests per client per minute. |
| `REDIS_URL` | unset | When set, rate limiting uses a shared Redis store so the limit holds across instances. When unset, the store is **in-memory and per-instance** (see Scaling below). Requires the optional `ioredis` package. |
| `PLAYGROUND` | `true` | Serves the interactive playground at `/` and `/playground`; set to `false` to disable (recommended for public production deployments). |

## Scaling

The service is fully stateless, so it scales horizontally. The one caveat is
rate limiting: without `REDIS_URL` the counter lives in each instance's memory,
so behind *N* replicas the effective limit is *N* × `RATE_LIMIT`. The service
logs a warning at startup in this mode. For a single shared limit across
replicas, set `REDIS_URL` (e.g. `redis://cache:6379`) — `ioredis` ships as an
optional dependency and is included in the Docker image.

## Docker

Build from the **repository root** (the image needs `packages/core` and
`spec/openapi.yaml`):

```sh
docker build -f service/Dockerfile -t paybysquare-service .
docker run --rm -p 8080:8080 -e AUTH_TOKEN=secret paybysquare-service
```

## Endpoints

### POST /v1/payload

Generate the raw payload string.

```sh
curl -s http://localhost:8080/v1/payload \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 12.34,
    "iban": "SK7283300000009111111118",
    "beneficiaryName": "Jane Doe",
    "variableSymbol": "47",
    "date": "2024-06-01"
  }'
# {"payload":"0004G0005ES..."}
```

With auth enabled, add `-H 'Authorization: Bearer secret'`.

### POST /v1/qr

Same body; returns a QR code image. Query parameters: `format=png|svg`
(default `png`) and `size` (64–1024 pixels, default 256, PNG only).

```sh
curl -s "http://localhost:8080/v1/qr?format=png&size=512" \
  -H 'Content-Type: application/json' \
  -d '{"amount": 12.34, "iban": "SK7283300000009111111118", "beneficiaryName": "Jane Doe"}' \
  -o qr.png

curl -s "http://localhost:8080/v1/qr?format=svg" \
  -H 'Content-Type: application/json' \
  -d '{"amount": 12.34, "iban": "SK7283300000009111111118", "beneficiaryName": "Jane Doe"}' \
  -o qr.svg
```

Validation failures return `400` with
`{"error": {"message": "...", "field": "..."}}`.

### GET /healthz

Liveness probe; returns `{"status":"ok"}`.

### GET /v1/openapi.json

Serves the OpenAPI 3.1 contract parsed from `spec/openapi.yaml`.
