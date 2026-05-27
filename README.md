# PAJOY Smart Business System

Monorepo: **pnpm workspaces**, **TypeScript**, **Vite/React** frontend (`artifacts/pajoy`), **Express** API (`artifacts/api-server`), **Drizzle ORM**, **Docker Compose**.

For a new **Windows + WSL2 + Docker Desktop** machine, follow **[docs/WSL-SETUP.md](docs/WSL-SETUP.md)** (recommended).

## Quick start

### WSL2 / Linux (recommended)

```bash
git clone <repo-url> ~/projects/Asset-Manager
cd ~/projects/Asset-Manager
bash scripts/setup.sh
```

Open http://localhost:3000

### Windows (Docker only)

```bat
setup.bat
```

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 22.x (`.nvmrc`) |
| pnpm | 10.12+ (`packageManager` in `package.json`) |
| Docker Desktop | With WSL2 backend |

Enable BuildKit:

```bash
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
```

## Default credentials

- Email: `admin@pajoy.co.ke`
- Password: `Admin@1234`

Change the password after first login.

## Services (Docker Compose)

| Service | URL / port |
|---------|------------|
| Frontend | http://localhost:3000 |
| API | http://localhost:8080 |
| Health | http://localhost:8080/api/healthz |
| Postgres | `localhost:5433` → container `5432` |
| Redis | `localhost:6379` |

## Environment files

| File | Purpose |
|------|---------|
| `.env.example` | Compose port/password overrides |
| `artifacts/api-server/.env.example` | API secrets, DB, Paystack |
| `artifacts/pajoy/.env.example` | Vite build-time variables |

Create locals (never commit):

```bash
pnpm setup:env
```

## Common commands

```bash
pnpm install --frozen-lockfile   # install deps
pnpm typecheck                   # TS check
pnpm build                       # build all packages
pnpm dev:api                     # API on :8080 (host)
pnpm dev:web                     # Vite on :5173 (host)
pnpm docker:up                   # start compose stack
pnpm docker:down                 # stop stack
docker compose logs -f api       # follow API logs
```

Makefile shortcuts: `make setup`, `make dev`, `make docker-rebuild`.

## Project layout

```
artifacts/
  api-server/     Express API + Dockerfile
  pajoy/          React/Vite app + nginx Dockerfile
lib/
  db/             Drizzle schema
  api-zod/        Shared Zod types
  api-client-react/
scripts/          seed, setup helpers
docker/           entrypoints
```

## Documentation

- [WSL2 setup, specs, troubleshooting](docs/WSL-SETUP.md)
- [.wslconfig example](.wslconfig.example)

## Security

Do not commit `.env` files. Use strong `JWT_SECRET` and database passwords in production.
