@echo off
setlocal
cd /d "%~dp0"
set DOCKER_BUILDKIT=1
set COMPOSE_DOCKER_CLI_BUILD=1
docker compose build
docker compose up -d
docker compose ps
endlocal
