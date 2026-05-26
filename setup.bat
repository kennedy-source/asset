@echo off
 echo Setting up PAJOY Smart Business System...
 echo.
 
 REM Check Docker
 docker --version > nul 2>&1
 if errorlevel 1 (
    echo ERROR: Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
 )
 
 REM Create env files if missing
 if not exist artifacts\api-server\.env (
    copy artifacts\api-server\.env.example artifacts\api-server\.env > nul
    echo Created artifacts\api-server\.env - please update with your credentials
 )
 if not exist artifacts\pajoy\.env (
    copy artifacts\pajoy\.env.example artifacts\pajoy\.env > nul
    echo Created artifacts\pajoy\.env - please update with your credentials
 )
 
 echo Starting services...
 docker-compose up -d --build
 
 echo.
 echo Waiting for database to be ready...
 timeout /t 15 > nul
 
 echo.
 echo ====================================
 echo PAJOY Smart Business System is ready
 echo ====================================
 echo Frontend: http://localhost:3000
 echo API:      http://localhost:8080
 echo.
 echo Default login:
 echo Email:    admin@pajoy.co.ke
 echo Password: Admin@1234
 echo.
 echo PLEASE CHANGE THE PASSWORD AFTER FIRST LOGIN
 echo ====================================
 pause
