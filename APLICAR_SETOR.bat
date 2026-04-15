@echo off
cd /d "%~dp0"
echo.
call npm run db:apply-setor
echo.
pause
