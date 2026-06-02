# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# PAJOY frontend — Vite build + nginx runtime
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
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare "pnpm@${PNPM_VERSION}" --activate

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc tsconfig.base.json ./
COPY artifacts/pajoy/package.json ./artifacts/pajoy/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY scripts/package.json ./scripts/

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --filter @workspace/pajoy...

FROM deps AS build

COPY tsconfig.json ./
COPY artifacts/pajoy ./artifacts/pajoy
COPY lib/api-client-react ./lib/api-client-react
COPY lib/api-zod ./lib/api-zod

# Bake API URL at build time (override with build-arg in CI/production)
ARG VITE_API_URL=
ARG VITE_PAYSTACK_PUBLIC_KEY=
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_PAYSTACK_PUBLIC_KEY=${VITE_PAYSTACK_PUBLIC_KEY}

WORKDIR /app/artifacts/pajoy
RUN pnpm run build

FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/artifacts/pajoy/dist /usr/share/nginx/html
COPY artifacts/pajoy/nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

EXPOSE 80

