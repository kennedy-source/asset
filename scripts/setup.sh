#!/usr/bin/env bash
# First-time setup for WSL2 / Linux (recommended over Windows host paths).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

info() { printf "${GREEN}[setup]${NC} %s\n" "$*"; }
warn() { printf "${RED}[setup]${NC} %s\n" "$*"; }

if [[ "$(pwd)" == /mnt/* ]]; then
  warn "Repository is on /mnt/c (Windows drive). For speed and native modules, clone under ~/projects instead."
fi

if ! command -v node >/dev/null 2>&1; then
  warn "Node.js 22 not found. Install via nvm: nvm install 22 && nvm use 22"
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" != "22" ]]; then
  warn "Expected Node 22.x, found $(node -v). Use: nvm install 22"
fi

if ! command -v corepack >/dev/null 2>&1; then
  warn "corepack not available — install Node 22 from nodejs.org or nvm"
  exit 1
fi

info "Enabling corepack + pnpm from packageManager field"
corepack enable
corepack prepare "$(node -p "require('./package.json').packageManager")" --activate

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

info "Validating workspace"
node scripts/validate-workspace.mjs

info "Creating .env files from templates"
node scripts/ensure-env.mjs

if command -v docker >/dev/null 2>&1; then
  info "Building and starting Docker stack"
  docker compose up -d --build
  info "Waiting for API health..."
  for i in $(seq 1 60); do
    if curl -fsS http://localhost:8080/api/healthz >/dev/null 2>&1; then
      info "API is healthy"
      node scripts/health-check.mjs || true
      break
    fi
    sleep 2
  done
else
  warn "Docker not installed — skipping compose. Run: pnpm install && pnpm dev:api"
  info "Installing dependencies with pnpm"
  pnpm install --frozen-lockfile
fi

cat <<'EOF'

============================================
 PAJOY setup complete
============================================
 Frontend: http://localhost:3000
 API:      http://localhost:8080/api/healthz
 Default:  admin@pajoy.co.ke / Admin@1234
============================================

EOF
