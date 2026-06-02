@echo off
setlocal
cd /d "%~dp0"
set DOCKER_BUILDKIT=1
set ENABLE_STARTUP_SEEDING=true
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check-and-build.ps1"
docker compose up -d
if errorlevel 1 exit /b 1
timeout /t 3 >nul
start http://localhost:3000
endlocal
