# PAJOY Smart Business System

## Local Windows + Docker Setup

### Requirements
- Docker Desktop installed
- Docker Compose available
- Windows command prompt or PowerShell

### Quick start
1. Open a terminal in the repository root.
2. Run `setup.bat`.
3. Wait for the services to start.
4. Open `http://localhost:3000`.

### Default credentials
- Email: `admin@pajoy.co.ke`
- Password: `Admin@1234`

> Please change the password after first login.

### Services
- Frontend: `http://localhost:3000`
- API: `http://localhost:8080`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

### Commands
- Start services: `start.bat`
- Stop services: `stop.bat`
- Rebuild and start: `docker-compose up -d --build`
- Health check: `curl http://localhost:8080/api/healthz`

### Notes
- `artifacts/api-server/.env` contains the backend environment settings.
- `artifacts/pajoy/.env` contains frontend build settings.
- The frontend is served by nginx and proxies `/api` to the backend.
- The API server runs migrations and seeds default data on startup.
