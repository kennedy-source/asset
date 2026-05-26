@echo off
 docker-compose up -d
 echo PAJOY is starting...
 timeout /t 5 > nul
 start http://localhost:3000
