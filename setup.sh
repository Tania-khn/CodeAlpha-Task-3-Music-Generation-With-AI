#!/bin/bash
# Music Studio - Mac/Linux Setup Script
# Run this once after unzipping the source.
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh

set -e

echo ""
echo "=== Music Studio Setup (Mac/Linux) ==="
echo ""

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "ERROR: python3 not found. Install Python 3.10+ from https://python.org"
    exit 1
fi

# Check Node
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm not found. Install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Step 1: Create Python venv
echo "[1/3] Creating Python venv..."
cd "$(dirname "$0")/mini-services/music-ai-service"
if [ -d "venv" ]; then
    echo "  venv already exists, skipping"
else
    python3 -m venv venv
fi
cd ../..

# Step 2: Install Python deps
echo ""
echo "[2/3] Installing Python dependencies (may take 5-10 min for torch)..."
./mini-services/music-ai-service/venv/bin/python -m pip install --upgrade pip
./mini-services/music-ai-service/venv/bin/pip install -r mini-services/music-ai-service/requirements.txt

# Step 3: Install Node deps
echo ""
echo "[3/3] Installing Node.js dependencies (may take 2-3 min)..."
npm install

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "  1. Run:  npm run dev"
echo "  2. Open: http://localhost:3000"
echo ""
