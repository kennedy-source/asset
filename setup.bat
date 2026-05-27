@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo PAJOY setup (Windows host - prefer WSL2, see docs/WSL-SETUP.md)
echo.

where docker >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker Desktop is not installed or not on PATH.
  exit /b 1
)

set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1

where node >nul 2>&1
if not errorlevel 1 (
  node scripts\validate-workspace.mjs
  node scripts\ensure-env.mjs
) else (
  if not exist artifacts\api-server\.env copy /Y artifacts\api-server\.env.example artifacts\api-server\.env >nul
  if not exist artifacts\pajoy\.env copy /Y artifacts\pajoy\.env.example artifacts\pajoy\.env >nul
  if not exist .env copy /Y .env.example .env >nul 2>nul
)

echo Building and starting containers...
docker compose up -d --build
if errorlevel 1 exit /b 1

echo Waiting for API...
set /a n=0
:wait_api
curl -fsS http://localhost:8080/api/healthz >nul 2>&1 && goto ready
set /a n+=1
if %n% GEQ 45 (
  echo WARN: API health check timed out. Check: docker compose logs api
  goto done
)
timeout /t 2 >nul
goto wait_api

:ready
echo API is healthy.

:done
echo.
echo ====================================
echo PAJOY is running
echo ====================================
echo Frontend: http://localhost:3000
echo API:      http://localhost:8080
echo Postgres: localhost:5433
echo.
echo Login: admin@pajoy.co.ke / Admin@1234
echo Change the password after first login.
echo ====================================
echo.

endlocal
