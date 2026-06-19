@echo off
REM Music Studio - Windows Setup Script
REM Run this once after unzipping the source.

echo.
echo === Music Studio Setup (Windows) ===
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

REM Check Node
call npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found. Install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

REM Step 1: Create Python venv
echo [1/3] Creating Python venv...
cd mini-services\music-ai-service
if exist venv (
    echo   venv already exists, skipping
) else (
    python -m venv venv
)
cd ..\..

REM Step 2: Install Python deps
echo.
echo [2/3] Installing Python dependencies ^(may take 5-10 min for torch^)...
call mini-services\music-ai-service\venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r mini-services\music-ai-service\requirements.txt
call deactivate

REM Step 3: Install Node deps
echo.
echo [3/3] Installing Node.js dependencies ^(may take 2-3 min^)...
call npm install

echo.
echo === Setup Complete! ===
echo.
echo Next steps:
echo   1. Run:  npm run dev
echo   2. Open: http://localhost:3000
echo.
pause
