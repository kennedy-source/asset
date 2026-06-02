@echo off
REM Build PAJOY in WSL to avoid Windows Docker Desktop issues
REM This script mirrors the repo to WSL and builds there

setlocal enabledelayedexpansion

echo.
echo PAJOY WSL Build Helper
echo ======================
echo.

set WSL_DIST=Ubuntu-22.04
set WSL_HOME=/home/%USERNAME%
set WSL_PROJECT=%WSL_HOME%/projects/Asset-Manager
set WINDOWS_PROJECT=%~dp0

echo Creating WSL project directory...
wsl -d %WSL_DIST% -- mkdir -p "%WSL_PROJECT%"

echo Syncing repository to WSL...
REM Use robocopy to mirror the workspace (Windows -> WSL mount point)
REM This is slower but more reliable than direct WSL copy for Compose files
robocopy "%WINDOWS_PROJECT%" "/mnt/c/Users/PC/assest/asset-wsl" /MIR /XD node_modules .git dist /XF *.bat *.log 2>nul

echo Building API container in WSL...
wsl -d %WSL_DIST% -- bash -lc "cd '%WSL_PROJECT%' && export DOCKER_BUILDKIT=1 && docker compose build api"

if errorlevel 1 (
  echo.
  echo Build failed. Troubleshooting tips:
  echo - Ensure Docker is running: 'docker desktop start'
  echo - Check WSL: 'wsl --status'
  echo - View logs: 'docker compose logs api'
  exit /b 1
)

echo.
echo Build successful!
echo You can now start the full stack:
echo   docker compose up -d
echo.

endlocal
