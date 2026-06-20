# CodeAlpha-Task-3-Music-Generation-With-AI
AI-powered music generation system that creates unique, high-quality audio tracks based on user prompts, emotions, and style preferences. It enables automatic composition, mixing, and sound design using advanced machine learning models. 🎵

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

### Step 3: Install Node.js dependencies

```bash
npm install
```

This installs Next.js, React, Tailwind, shadcn/ui, etc. Takes 2-3 minutes.

```

### Step 5: Run the application

```bash
npm run dev
```

Then open http://localhost:3000 in your browser.

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

## License

MIT - feel free to use, modify, and distribute.

