@echo off
cd /d "%~dp0"

if not exist "node_modules" (
    echo.
    echo First-time setup has not been completed.
    echo Please run npm.cmd install first.
    echo.
    pause
    exit /b
)

if not exist "dist\server.cjs" (
    echo.
    echo The dashboard has not been built yet.
    echo Please run npm.cmd run build first.
    echo.
    pause
    exit /b
)

start "3 Dimensions Dashboard Server" cmd /k "cd /d ""%~dp0"" && npm.cmd start"

timeout /t 3 /nobreak >nul

start "" "http://localhost:3000"

exit