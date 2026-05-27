# Asset-Manager — Final Migration Report

Infrastructure pass for **pnpm monorepo + Docker + WSL2 + Node 22** onboarding on a new desktop.

---

## Executive summary

| Area | Before | After |
|------|--------|-------|
| Docker deps layer | Full source copied before `pnpm install` | Lockfiles/manifests first; filtered `--filter` installs |
| Build cache | None | BuildKit `pnpm` store mount (`/pnpm/store`) |
| API image | Single-stage Alpine, full monorepo | Multi-stage `bookworm-slim`, `pnpm deploy`, non-root user |
| Compose | Basic `depends_on` | Healthchecks + `service_healthy` conditions |
| Version pinning | Implicit | `packageManager`, `engines`, `.nvmrc`, Corepack in Docker |
| Onboarding | Windows `setup.bat` only | WSL scripts + Makefile + env bootstrap + validation |
| CI | None | Typecheck + workspace/env validation + Docker build (GHA cache) |
| Workspace | Empty `lib/integrations/*` glob | Removed invalid glob |

**Breaking changes:** None for application code. Docker API image now runs as user `pajoy` (uid 1001). Compose Postgres host port defaults to **5433** (not 5432) to avoid conflicts.

---

## Files created

| File | Purpose |
|------|---------|
| `FINAL_MIGRATION_REPORT.md` | This document |
| `docker/api-entrypoint.sh` | DB TCP wait before API start |
| `docker-compose.dev.yml` | Infra-only dev overlay (profiles for app containers) |
| `.env.example` | Root Compose variable templates |
| `.nvmrc` / `.node-version` | Node 22 pin |
| `.wslconfig.example` | WSL2 RAM/CPU template |
| `docs/WSL-SETUP.md` | WSL2/Docker onboarding + troubleshooting |
| `scripts/ensure-env.mjs` | Env bootstrap + validation |
| `scripts/validate-workspace.mjs` | Workspace package integrity |
| `scripts/health-check.mjs` | HTTP health probes |
| `scripts/setup.sh` | One-command WSL setup |
| `scripts/dev.sh` | Infra in Docker, apps on host |
| `scripts/docker-rebuild.sh` | Rebuild + restart stack |
| `rebuild.bat` | Windows rebuild helper |
| `Makefile` | Common targets |
| `.github/workflows/ci.yml` | CI pipeline |

## Files modified

| File | Changes |
|------|---------|
| `artifacts/api-server/Dockerfile` | Multi-stage, cache mounts, filtered install, deploy, healthcheck, non-root |
| `artifacts/pajoy/Dockerfile` | Multi-stage, cache mounts, filtered install, Vite build-args |
| `docker-compose.yml` | Healthchecks, env defaults, production `NODE_ENV`, ports |
| `.dockerignore` | Large context exclusions |
| `.gitignore` | `.pnpm-store`, `.env`, logs, `attached_assets` |
| `.npmrc` | Frozen preference, retries, native build notes |
| `package.json` | `packageManager`, `engines`, docker/validate scripts |
| `pnpm-workspace.yaml` | Removed empty `lib/integrations/*` |
| `README.md` | WSL-first quick start |
| `setup.bat` / `start.bat` / `stop.bat` | BuildKit, validation, health wait |
| `artifacts/api-server/.env.example` | Docker vs host DB comments |
| `artifacts/pajoy/.env.example` | Vite / nginx proxy comments |
| `artifacts/api-server/package.json` | `files` field for deploy |
| `docs/WSL-SETUP.md` | `/mnt/c` performance explanation |

---

## Architecture improvements

### Docker layer caching

1. **Copy** `package.json`, `pnpm-lock.yaml`, workspace manifests only  
2. **`pnpm install --filter @workspace/<app>...`** with cache mount  
3. **Copy** source  
4. **Build**  
5. **Runtime** via `pnpm deploy --prod` (API) or nginx (frontend)

Code edits no longer invalidate step 2.

### Native modules

- **Debian bookworm-slim** (glibc) instead of Alpine for compile/install  
- `python3`, `make`, `g++` in build stages  
- `PNPM_CONFIG_DANGEROUSLY_ALLOW_ALL_BUILDS=true` in Docker  
- `onlyBuiltDependencies` / `allowBuilds` in `pnpm-workspace.yaml` for `better-sqlite3`, `esbuild`, `lzma-native`, `protobufjs`

### Startup sequencing

- Postgres + Redis healthchecks  
- API waits for DB port (`docker/api-entrypoint.sh`)  
- API `/api/healthz` before frontend starts  
- Migrations run in API process on startup (existing behavior)

---

## First-time setup (new desktop)

### WSL2 (recommended)

```bash
# Prerequisites: Docker Desktop (WSL integration), Ubuntu 24.04, nvm
git clone <repo> ~/projects/Asset-Manager
cd ~/projects/Asset-Manager

export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

chmod +x scripts/*.sh
bash scripts/setup.sh
```

### Windows (Docker only)

```bat
setup.bat
```

### Verify

```bash
pnpm validate
curl -fsS http://localhost:8080/api/healthz
pnpm health-check   # after stack is up
```

---

## Development modes

| Mode | Command | Use when |
|------|---------|----------|
| Full Docker | `docker compose up -d --build` | Quickest parity with production |
| Hybrid | `bash scripts/dev.sh` + `pnpm dev:api` + `pnpm dev:web` | Fastest iteration in WSL2 |
| Host-only DB | Use `docker-compose.dev.yml` for postgres/redis only | Daily feature work |

Hybrid API `.env`:

```env
DATABASE_URL=postgresql://pajoy:pajoypassword@localhost:5433/pajoy
DB_PROVIDER=postgres
```

---

## Recommended machine specs

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 cores | 8+ |
| RAM | 8 GB | 16 GB |
| Disk | 30 GB free SSD | 50 GB+ NVMe |
| WSL RAM | 4 GB | 8–12 GB (`.wslconfig`) |

### Docker Desktop

- WSL2 engine enabled  
- 6–8 GB memory, 4 CPUs  
- `DOCKER_BUILDKIT=1`

---

## Exact commands reference

```bash
pnpm install --frozen-lockfile   # Install deps
pnpm setup:env                   # Create .env from templates
pnpm validate                    # Workspace + env checks
pnpm typecheck                   # TypeScript
pnpm build                       # Build all packages
pnpm dev:api                     # API :8080
pnpm dev:web                     # Vite :5173
pnpm docker:up                   # Start compose
pnpm docker:down                 # Stop compose
bash scripts/docker-rebuild.sh   # Rebuild images
make setup                       # Same as scripts/setup.sh
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Slow `pnpm install` / Docker build | Move repo off `/mnt/c` → `~/projects` |
| `better-sqlite3` compile error | Use WSL; `sudo apt install build-essential python3` |
| API exits on start | `docker compose logs api`; check `DATABASE_URL` host (`postgres` in Docker, `localhost:5433` on host) |
| Port in use | Set `API_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT` in root `.env` |
| Stale Docker deps | `docker compose build --no-cache api frontend` |
| CI env validation fails | Run `pnpm setup:env` locally |

---

## Health endpoints

| Service | URL |
|---------|-----|
| API | `GET http://localhost:8080/api/healthz` |
| Frontend | `GET http://localhost:3000/` |
| Postgres | `pg_isready` (internal) |
| Redis | `redis-cli ping` (internal) |

---

## Validation performed (logical)

- [x] Dockerfiles: manifest-first COPY, filtered pnpm, multi-stage, healthchecks  
- [x] Compose: postgres/redis/api health + `depends_on` conditions  
- [x] Workspace validator covers all `pnpm-workspace.yaml` globs  
- [x] Env bootstrap + JWT/DATABASE_URL checks  
- [x] Scripts reference `scripts/` paths and `/api/healthz`  
- [x] No application routes or package names changed  

**Not run in this session:** full `docker compose build` (requires Docker daemon on target machine).

---

## Next steps on target machine

1. Copy `.wslconfig.example` → `%UserProfile%\.wslconfig`; `wsl --shutdown`  
2. Clone under `~/projects/Asset-Manager`  
3. `bash scripts/setup.sh`  
4. Change default admin password  
5. Rotate `JWT_SECRET` and `POSTGRES_PASSWORD` before production  

See also: [docs/WSL-SETUP.md](docs/WSL-SETUP.md), [README.md](README.md).
