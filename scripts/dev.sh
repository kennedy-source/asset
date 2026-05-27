#!/usr/bin/env bash
# Start infra in Docker, API + Vite on the host (fast iteration in WSL2).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export DOCKER_BUILDKIT=1

docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d postgres redis

corepack enable 2>/dev/null || true
pnpm install --frozen-lockfile

node scripts/ensure-env.mjs

echo "[dev] Postgres :5433  Redis :6379"
echo "[dev] Run in two terminals:"
echo "      pnpm dev:api"
echo "      pnpm dev:web"
