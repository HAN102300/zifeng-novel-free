@echo off

REM zifeng-novel dev startup script (Windows)

echo.
echo ========================================
echo   zifeng-novel - Dev Environment Start
echo ========================================
echo.

where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js not found, please install Node.js 18+
    pause
    exit /b 1
)

where java >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Java not found, please install Java 17+
    pause
    exit /b 1
)

where mvn >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Maven not found, please install Maven
    pause
    exit /b 1
)

echo [OK] System requirements check passed

echo.
echo [NOTE] Make sure MySQL and Redis are running
set /p confirm="Confirm database services are running? (y/N): "
if /i "%confirm%" NEQ "y" (
    echo [CANCEL] Please start database services first
    pause
    exit /b 1
)

echo.
echo [1/4] Starting parser engine (port 3001)...
cd /d "%~dp0zifeng-parser"
if not exist "node_modules" (
    call npm install
)
start "zifeng-parser" powershell /c "npm start"
cd /d "%~dp0"

echo [2/4] Starting SpringBoot backend (port 8080)...
start "zifeng-server" powershell /c "cd /d "%~dp0zifeng-server" && mvn spring-boot:run -q || pause"

echo [3/4] Starting web frontend (port 5173)...
cd /d "%~dp0zifeng-web"
if not exist "node_modules" (
    call npm install
)
start "zifeng-web" powershell /c "npm run dev"
cd /d "%~dp0"

echo [4/4] Starting admin panel (port 3002)...
cd /d "%~dp0zifeng-admin"
if not exist "node_modules" (
    call npm install
)
start "zifeng-admin" powershell /c "npm run dev"
cd /d "%~dp0"

echo.
echo ========================================
echo   All services started!
echo ========================================
echo.
echo   Web:        http://localhost:5173
echo   Admin:      http://localhost:3002
echo   API:        http://localhost:8080
echo   Parser:     http://localhost:3001
echo.
echo   To stop:    run stop-dev.bat
echo.
pause
