import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { getPythonBin, SCRIPTS_DIR } from "@/lib/python";

const execFileAsync = promisify(execFile);
const PYTHON_BIN = getPythonBin();

// Global state shared with train-status route
declare global {
  var __musicTrainingState: {
    inProgress: boolean;
    progress: number;
    trainedModels: string[];
  } | undefined;
}

const trainingState = global.__musicTrainingState ??= {
  inProgress: false,
  progress: 0,
  trainedModels: scanTrainedModels(),
};

// Scan models dir on first load so pre-trained models show up immediately
function scanTrainedModels(): string[] {
  try {
    const modelsDir = path.join(process.cwd(), "mini-services", "music-ai-service", "data", "models");
    if (!fs.existsSync(modelsDir)) return [];
    return fs.readdirSync(modelsDir)
      .filter(f => f.endsWith("_lstm.pt"))
      .map(f => f.replace("_lstm.pt", ""));
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  if (trainingState.inProgress) {
    return NextResponse.json(
      { error: "Training already in progress", progress: trainingState.progress },
      { status: 409 }
    );
  }

  try {
    const body = await request.json();
    const genre = body.genre || "classical";
    const epochs = String(body.epochs || 30);
    const sequenceLength = String(body.sequenceLength || 32);

    trainingState.inProgress = true;
    trainingState.progress = 10;

    // Run training in background
    const trainPromise = execFileAsync(PYTHON_BIN, [
      path.join(SCRIPTS_DIR, "trainer.py"),
      genre, epochs, sequenceLength,
    ], { timeout: 300000, maxBuffer: 10 * 1024 * 1024 });

    trainPromise.then(({ stdout }) => {
      try {
        const data = JSON.parse(stdout);
        trainingState.progress = 100;
        if (!trainingState.trainedModels.includes(genre)) {
          trainingState.trainedModels.push(genre);
        }
      } catch {
        trainingState.progress = 0;
      }
      trainingState.inProgress = false;
    }).catch(() => {
      trainingState.inProgress = false;
      trainingState.progress = 0;
    });

    return NextResponse.json({
      message: "Training started",
      genre,
      epochs: Number(epochs),
    });
  } catch (error: any) {
    trainingState.inProgress = false;
    return NextResponse.json(
      { error: "Training failed to start", details: error.message?.slice(-200) },
      { status: 500 }
    );
  }
}
