# Build from the repository root:
#   docker build -f service/Dockerfile -t paybysquare-service .
FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2 AS build
WORKDIR /app

# Build the core library first (the service depends on it via file:../packages/core).
COPY packages/core/package.json packages/core/package-lock.json packages/core/
COPY packages/core/tsconfig.json packages/core/tsconfig.build.json packages/core/
COPY packages/core/src packages/core/src
RUN cd packages/core && npm ci && npm run build

# Build the service, then drop dev dependencies so only runtime packages ship.
COPY service/package.json service/package-lock.json service/
COPY service/tsconfig.json service/tsconfig.build.json service/
COPY service/src service/src
RUN cd service && npm ci && npm run build && npm prune --omit=dev

# The runtime serves spec/openapi.yaml at /v1/openapi.json.
COPY spec/openapi.yaml spec/openapi.yaml

FROM node:22-alpine@sha256:16e22a550f3863206a3f701448c45f7912c6896a62de43add43bb9c86130c3e2
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/packages/core/package.json packages/core/package.json
COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/service/package.json service/package.json
COPY --from=build /app/service/node_modules service/node_modules
COPY --from=build /app/service/dist service/dist
COPY --from=build /app/spec/openapi.yaml spec/openapi.yaml

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

WORKDIR /app/service
CMD ["node", "dist/server.js"]
