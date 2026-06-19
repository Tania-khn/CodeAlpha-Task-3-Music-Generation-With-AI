#!/usr/bin/env python3
"""
Setup script for Music Studio - Run this once after unzipping the source.

This script:
  1. Creates a Python venv inside mini-services/music-ai-service/venv
  2. Installs Python dependencies (music21, torch, numpy)
  3. Installs Node.js dependencies (npm install)

Usage:
  Mac/Linux:  python3 setup.py
  Windows:    python setup.py
"""
import os
import subprocess
import sys
import platform
from pathlib import Path

ROOT = Path(__file__).parent.resolve()
AI_SERVICE = ROOT / "mini-services" / "music-ai-service"
VENV_DIR = AI_SERVICE / "venv"

def run(cmd, cwd=None, check=True):
    print(f"  $ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd)
    if check and result.returncode != 0:
        print(f"  FAILED with exit code {result.returncode}")
        sys.exit(1)
    return result.returncode

def main():
    is_win = platform.system() == "Windows"
    py_bin = sys.executable
    print(f"\n=== Music Studio Setup ===\n")
    print(f"OS: {platform.system()}")
    print(f"Python: {py_bin}")
    print(f"Project root: {ROOT}\n")

    # --- 1. Create Python venv ---
    if VENV_DIR.exists():
        print(f"[1/4] Python venv already exists at {VENV_DIR} - skipping creation")
    else:
        print(f"[1/4] Creating Python venv at {VENV_DIR}")
        run([py_bin, "-m", "venv", str(VENV_DIR)])

    venv_python = VENV_DIR / ("Scripts" if is_win else "bin") / ("python.exe" if is_win else "python")

    # --- 2. Install Python deps ---
    print(f"\n[2/4] Installing Python dependencies (this may take 5-10 min for torch)...")
    run([str(venv_python), "-m", "pip", "install", "--upgrade", "pip"])
    run([str(venv_python), "-m", "pip", "install", "-r", str(AI_SERVICE / "requirements.txt")])

    # --- 3. Install Node.js deps ---
    print(f"\n[3/4] Installing Node.js dependencies (this may take 2-3 min)...")
    npm_cmd = "npm.cmd" if is_win else "npm"
    run([npm_cmd, "install"], cwd=str(ROOT))

    # --- 4. Verify ---
    print(f"\n[4/4] Verifying setup...")
    run([str(venv_python), "-c", "import music21, torch, numpy; print('Python deps OK')"])
    run([npm_cmd, "--version"], cwd=str(ROOT))

    print(f"\n=== Setup Complete! ===\n")
    print(f"Next steps:")
    print(f"  1. Start the app:  npm run dev")
    print(f"  2. Open browser:   http://localhost:3000")
    print(f"\nIf npm run dev fails, try:")
    print(f"  - Mac/Linux:  export PYTHON_BIN={venv_python}")
    print(f"  - Windows:    set PYTHON_BIN={venv_python}")

if __name__ == "__main__":
    main()
