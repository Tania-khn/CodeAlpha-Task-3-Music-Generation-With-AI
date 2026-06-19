
# Music Studio - AI-Powered Music Generation

Generate music across 5 genres (Classical, Jazz, Blues, Pop, Electronic) using:
- **Quick Generate**: Instant algorithmic music generation (no training needed)
- **LSTM Generate**: Deep learning-based generation using PyTorch LSTM neural network

## Features

- 5 music genres: Classical, Jazz, Blues, Pop, Electronic
- Real-time playback via Web Audio API with piano-roll visualization
- Waveform visualizer
- Train your own LSTM models per genre
- Download generated MIDI files
- Pre-loaded sample library (3 tracks per genre)
- Modern Next.js + Tailwind CSS + shadcn/ui frontend
- Python + PyTorch + music21 backend

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend (Node) | Next.js API Routes (port 3000) |
| Backend (AI) | Bun service with Python scripts (port 3002) |
| AI / ML | PyTorch (LSTM), music21, NumPy |
| Audio | Web Audio API (browser-native) |

## Project Structure

```
music-studio/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Main UI (landing + studio)
│   │   ├── layout.tsx                # Root layout
│   │   ├── globals.css               # Tailwind styles
│   │   └── api/
│   │       └── music/
│   │           ├── health/           # Service health check
│   │           ├── genres/           # Available genres list
│   │           ├── samples/          # Pre-defined sample tracks
│   │           ├── sample-data/      # Sample note data for playback
│   │           ├── quick-generate/   # Algorithmic generation
│   │           ├── collect-data/     # Collect MIDI training data
│   │           ├── preprocess/       # Preprocess MIDI -> sequences
│   │           ├── train/            # Train LSTM (async)
│   │           ├── train-status/     # Training progress polling
│   │           ├── generate/         # Generate with LSTM model
│   │           └── download/         # Download MIDI file
│   ├── components/ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── python.ts                 # Cross-platform Python binary resolver
│   │   ├── utils.ts                  # cn() helper
│   │   └── db.ts                     # Prisma client
│   └── hooks/                        # React hooks
├── mini-services/
│   └── music-ai-service/
│       ├── index.ts                  # Bun AI service (port 3002)
│       ├── package.json              # Bun service metadata
│       ├── requirements.txt          # Python deps
│       ├── scripts/                  # Python AI scripts
│       │   ├── data_collector.py     # Generate MIDI training data
│       │   ├── preprocessor.py       # Parse MIDI -> note sequences
│       │   ├── trainer.py            # Train LSTM model
│       │   ├── generator.py          # Generate music with trained LSTM
│       │   └── quick_generator.py    # Algorithmic generation
│       └── data/
│           ├── midi/                 # MIDI training data
│           ├── processed/            # Pickled sequences
│           ├── models/               # Trained .pt model files
│           ├── generated/            # Generated MIDI output
│           └── samples/              # Sample note data JSON
├── package.json                      # Next.js dependencies
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
└── README.md
```

## Prerequisites

Install these on your machine first:

### 1. Node.js (v18+)
Download from https://nodejs.org/ - choose LTS version

Verify:
```bash
node --version   # should be >= 18
npm --version
```

### 2. Python (v3.10+)
Download from https://www.python.org/downloads/

**Important for Windows**: Check "Add Python to PATH" during install

Verify:
```bash
python --version   # Windows
python3 --version  # Mac/Linux
```

### 3. Bun (optional, only if you want to run the standalone AI service)
```bash
# Mac/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"

# Or via npm
npm install -g bun
```

Verify:
```bash
bun --version
```

### 4. VS Code (Editor)
Download from https://code.visualstudio.com/

Recommended extensions:
- ESLint
- Prettier
- Python (Microsoft)
- Tailwind CSS IntelliSense

## Setup Instructions

### Step 1: Unzip and open in VS Code

Unzip `MusicStudio-SourceCode.zip` to a folder, e.g., `MusicStudio`.

```bash
# Mac/Linux
unzip MusicStudio-SourceCode.zip -d MusicStudio
cd MusicStudio
code .            # Opens VS Code
```

```powershell
# Windows (PowerShell)
Expand-Archive MusicStudio-SourceCode.zip -DestinationPath MusicStudio
cd MusicStudio
code .
```

### Step 2: Create a Python virtual environment

Open VS Code's integrated terminal (`Ctrl + ` ` or `Cmd + ` `) and run:

**Mac/Linux:**
```bash
cd mini-services/music-ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..
```

**Windows:**
```powershell
cd mini-services\music-ai-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd ..\..
```

> **Note**: `torch` is large (~750 MB CPU-only). Install may take 5-10 minutes.

If `torch` install fails on Windows, try:
```powershell
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

### Step 3: Install Node.js dependencies

```bash
npm install
```

This installs Next.js, React, Tailwind, shadcn/ui, etc. Takes 2-3 minutes.

### Step 4: Set up environment file

```bash
cp .env.example .env
```

(On Windows: `copy .env.example .env`)

The default `.env` should contain:
```
DATABASE_URL=file:./db/custom.db
```

### Step 5: Run the application

You have two options:

#### Option A: Run with npm (simpler, recommended)

The Next.js API routes can directly call the Python scripts. Just run:

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

#### Option B: Run with both Next.js + Bun AI service

For the full architecture (Next.js frontend + Bun AI service on port 3002):

Terminal 1 (start Next.js):
```bash
npm run dev
```

Terminal 2 (start Bun AI service):
```bash
cd mini-services/music-ai-service
bun run dev
cd ../..
```

Then open http://localhost:3000.

> The frontend works fine with **Option A** alone. Use **Option B** only if you want to test the standalone AI service endpoints on port 3002.

## Using the App

1. **Landing page**: Click "Enter Studio"
2. **Studio main screen**:
   - Select a genre (Classical, Jazz, Blues, Pop, Electronic)
   - Adjust tempo, key, instrument, temperature
   - Click **"Quick Generate"** for instant algorithmic music
   - Click **"Run Full Pipeline"** to train an LSTM model and generate
   - Click **"Generate with AI"** (only after training) to use the LSTM model
3. **Player controls**: Skip Back, Play/Pause, Stop (red)
4. **Piano roll**: Visualizes generated notes
5. **Waveform**: Real-time audio visualization
6. **Sample Library**: Pre-curated demo tracks per genre (left sidebar)
7. **History**: Past generations (right sidebar)

## Common Issues

### "Quick generation failed"
- Python venv not set up: redo Step 2
- Wrong Python binary: set `PYTHON_BIN` env var in `.env`:
  ```
  PYTHON_BIN=C:\path\to\python.exe
  ```

### "LSTM generation failed. Make sure a model is trained"
- You need to train a model first: click "Run Full Pipeline"
- Or use Quick Generate instead (works without training)

### Port 3000 or 3002 already in use
- Change port in `package.json`: `"dev": "next dev -p 3001"`
- Or kill the process using the port

### Python `ModuleNotFoundError: No module named 'music21'`
- Activate your venv first: `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows)
- Reinstall: `pip install -r requirements.txt`

## Uploading to GitHub

### Step 1: Create a new GitHub repository

1. Go to https://github.com/new
2. Name it `music-studio` (or any name)
3. Set to **Public** or **Private**
4. **Do NOT** initialize with README/license/.gitignore (we already have these)
5. Click **Create repository**

### Step 2: Initialize git in your project

In VS Code terminal:

```bash
git init
git add .
git commit -m "Initial commit: Music Studio AI generation app"
```

### Step 3: Connect to GitHub and push

Copy the URL from your GitHub repo page, then:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/music-studio.git
git push -u origin main
```

If you get an authentication error:
- Use a Personal Access Token instead of password
- Or use GitHub CLI: `gh auth login` then `gh repo create`

### Step 4: Verify on GitHub

Refresh your repo page on GitHub - you should see all the files.

> **Note**: `node_modules/`, `venv/`, `.next/`, `db/`, and trained models are excluded via `.gitignore`. Anyone who clones the repo will need to run setup Steps 2-4 to install dependencies.

## License

MIT - feel free to use, modify, and distribute.
# CodeAlpha-Task-3-Music-Generation-With-AI
AI-powered music generation system that creates unique, high-quality audio tracks based on user prompts, emotions, and style preferences. It enables automatic composition, mixing, and sound design using advanced machine learning models. 🎵

