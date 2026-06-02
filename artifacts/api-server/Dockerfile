# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# PAJOY API — multi-stage build with pnpm cache mounts and workspace-aware deploy
# -----------------------------------------------------------------------------

ARG NODE_VERSION=22-bookworm-slim
ARG PNPM_VERSION=10.12.4

FROM node:${NODE_VERSION} AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
ENV PNPM_CONFIG_DANGEROUSLY_ALLOW_ALL_BUILDS=true
ENV PNPM_CONFIG_FETCH_TIMEOUT=600000
ENV PNPM_CONFIG_FETCH_RETRIES=5

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /app

# -----------------------------------------------------------------------------
# Dependencies layer (cache-friendly)
# -----------------------------------------------------------------------------
FROM base AS deps

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./

COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/pajoy/package.json ./artifacts/pajoy/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY scripts/package.json ./scripts/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter @workspace/api-server...

# -----------------------------------------------------------------------------
# Build stage
# -----------------------------------------------------------------------------
FROM deps AS build

COPY tsconfig.json ./
COPY artifacts/api-server ./artifacts/api-server
COPY lib ./lib

# ============================================================
# IMPORTANT FIX:
# Ensure migrations exist in build context BEFORE pnpm deploy
# so they are included in /deploy/api output
# ============================================================
COPY lib/db/drizzle/migrations ./lib/db/drizzle/migrations

WORKDIR /app/artifacts/api-server
RUN pnpm run build && test -f dist/index.mjs

# -----------------------------------------------------------------------------
# Pruned production deploy
# -----------------------------------------------------------------------------
WORKDIR /app

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm --filter @workspace/api-server deploy --legacy --prod /deploy/api \
  && cp -a artifacts/api-server/dist /deploy/api/dist \
  && mkdir -p /deploy/api/drizzle/migrations \
  && cp -a /app/lib/db/drizzle/migrations/. /deploy/api/drizzle/migrations \
  && test -f /deploy/api/dist/index.mjs

# -----------------------------------------------------------------------------
# Runtime
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runtime

ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --gid 1001 pajoy \
  && useradd --uid 1001 --gid pajoy --create-home pajoy

# Application
COPY --from=build --chown=pajoy:pajoy /deploy/api /app

# Entrypoint
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

# Runtime directories
RUN mkdir -p /app/uploads /app/backups \
  && chown -R pajoy:pajoy /app/uploads /app/backups

USER pajoy

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8080/api/healthz || exit 1

ENTRYPOINT ["api-entrypoint.sh"]
CMD ["node", "--enable-source-maps", "dist/index.mjs"]