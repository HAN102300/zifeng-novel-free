@echo off

REM zifeng-novel dev stop script (Windows)

echo.
echo ========================================
echo   zifeng-novel - Stop All Services
echo ========================================
echo.

echo [1/3] Stopping Node.js services...
taskkill /fi "WINDOWTITLE eq zifeng-parser*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq zifeng-web*" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq zifeng-admin*" /f >nul 2>&1

echo [2/3] Stopping SpringBoot backend...
taskkill /fi "WINDOWTITLE eq zifeng-server*" /f >nul 2>&1

echo [3/3] Cleaning up remaining processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /pid %%a /f >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /pid %%a /f >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3002 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /pid %%a /f >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8080 " ^| findstr "LISTENING" 2^>nul') do (
    taskkill /pid %%a /f >nul 2>&1
)

echo.
echo ========================================
echo   All services stopped
echo ========================================
echo.
pause
