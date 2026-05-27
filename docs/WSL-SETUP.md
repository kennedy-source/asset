# WSL2 + Docker Desktop setup (recommended)

Linux-first development on Windows avoids `/mnt/c` slowness, file-watcher issues, and `better-sqlite3` rebuild pain.

## Why not clone on `/mnt/c`?

WSL mounts Windows drives (e.g. `C:\Users\you\project` → `/mnt/c/Users/you/project`) through the **9P filesystem bridge**. Every file operation crosses the Windows↔Linux boundary. For a pnpm monorepo this means:

- **Installs**: tens of thousands of small files → 5–20× slower than `~/projects` on ext4
- **Docker build context**: scanning and sending files to the daemon is much slower from `/mnt/c`
- **Native modules** (`better-sqlite3`, `esbuild`): compile + filesystem metadata updates are unreliable on 9P
- **File watchers** (Vite HMR): events are delayed or dropped on mounted drives

**Rule:** clone to `~/projects/Asset-Manager` inside Ubuntu. Use `/mnt/c` only for occasional file exchange, not daily development.

## Migration checklist

- [ ] Install WSL2 (Ubuntu 24.04) and Docker Desktop with WSL integration
- [ ] Clone repo under `~/projects/Asset-Manager` (not `C:\Users\...`)
- [ ] Copy `.wslconfig.example` → `%UserProfile%\.wslconfig` and reboot WSL
- [ ] Install Node 22 via `nvm` inside WSL
- [ ] Run `corepack enable` and `pnpm install`
- [ ] Copy env templates: `pnpm setup:env`
- [ ] Start stack: `bash scripts/setup.sh` or `docker compose up -d --build`
- [ ] Verify: `curl http://localhost:8080/api/healthz`
- [ ] Open http://localhost:3000 and change default password

## Recommended machine specs

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16 GB (WSL capped ~8–12 GB) |
| Disk | 30 GB free SSD | NVMe, 50 GB+ for images + pnpm store |
| WSL RAM | 4 GB | 8–12 GB in `.wslconfig` |

## WSL2 settings

Copy [`.wslconfig.example`](../.wslconfig.example) to `C:\Users\<you>\.wslconfig`:

```ini
[wsl2]
memory=8GB
processors=4
swap=4GB
localhostForwarding=true
```

Then: `wsl --shutdown` and reopen Ubuntu.

## Docker Desktop settings

- **Use WSL 2 based engine**: enabled  
- **Resources**: CPUs 4+, Memory 6–8 GB, Swap 2 GB  
- **File sharing**: only needed if you insist on building from `C:\` (avoid)  
- **Enable containerd / BuildKit**: default on recent Desktop versions  
- Set environment on Windows host (optional):

  ```powershell
  [Environment]::SetEnvironmentVariable("DOCKER_BUILDKIT", "1", "User")
  ```

## Node + pnpm versions

| Tool | Version |
|------|---------|
| Node | **22.x** (see `.nvmrc`) |
| pnpm | **10.12+** (see `packageManager` in root `package.json`) |

```bash
nvm install 22
nvm use 22
corepack enable
corepack prepare pnpm@10.12.4 --activate
pnpm install --frozen-lockfile
```

## First-time setup (WSL)

```bash
cd ~/projects/Asset-Manager
bash scripts/setup.sh
```

## Development modes

### A — Full stack in Docker (simplest)

```bash
docker compose up -d --build
# Frontend http://localhost:3000  API http://localhost:8080
```

### B — Infra in Docker, app on host (fastest iteration)

```bash
bash scripts/dev.sh
# terminal 1
pnpm dev:api
# terminal 2
pnpm dev:web
```

Use `artifacts/api-server/.env` with:

```env
DATABASE_URL=postgresql://pajoy:pajoypassword@localhost:5433/pajoy
DB_PROVIDER=postgres
```

## Build / start commands

| Task | Command |
|------|---------|
| Install deps | `pnpm install --frozen-lockfile` |
| Typecheck | `pnpm typecheck` |
| Build all | `pnpm build` |
| Docker build | `pnpm docker:build` or `docker compose build` |
| Docker up | `pnpm docker:up` |
| Rebuild images | `bash scripts/docker-rebuild.sh` |
| Logs | `pnpm docker:logs` |
| Health | `curl -fsS http://localhost:8080/api/healthz` |

## Troubleshooting

### Slow `pnpm install` or Docker build on `/mnt/c`

Move the clone to `~/projects`. Performance on Windows-mounted drives is 5–20× slower.

### `better-sqlite3` / native module errors

- Develop in WSL, not Windows CMD, for local SQLite mode  
- Ensure build tools: `sudo apt install -y build-essential python3`  
- pnpm only builds listed packages (`onlyBuiltDependencies` in `pnpm-workspace.yaml`)

### API container exits / DB connection refused

- Check Postgres: `docker compose ps`  
- Logs: `docker compose logs api postgres`  
- `DATABASE_URL` host must be `postgres` inside Compose, `localhost` on host dev

### 403 / empty products for non-admin users

Role-based API access — ensure user role is in allowed groups (see `artifacts/api-server/src/lib/rbac.ts`).

### Port already in use

Change root `.env`: `API_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT`.

### Permission denied on `scripts/*.sh`

```bash
chmod +x scripts/*.sh
```

### Stale Docker layers after dependency changes

```bash
docker compose build --no-cache api frontend
```

## Secrets

- Never commit `.env` files (see `.gitignore`)  
- Use `.env.example` as templates only  
- Rotate `JWT_SECRET`, `POSTGRES_PASSWORD`, and Paystack keys for production

## CI/CD

GitHub Actions workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) — typecheck + Docker build on push/PR.
