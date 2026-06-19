import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

// This shares state with the train route through module-level variables
// Since Next.js may hot-reload, we use a global to persist
declare global {
  var __musicTrainingState: {
    inProgress: boolean;
    progress: number;
    trainedModels: string[];
  } | undefined;
}

// Scan models dir on each load so freshly trained models show up
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

const trainingState = global.__musicTrainingState ??= {
  inProgress: false,
  progress: 0,
  trainedModels: scanTrainedModels(),
};

export async function GET() {
  // Always re-scan in case models were added by the Bun service
  const onDisk = scanTrainedModels();
  const merged = Array.from(new Set([...trainingState.trainedModels, ...onDisk]));
  return NextResponse.json({
    training: trainingState.inProgress,
    progress: trainingState.progress,
    models: merged,
  });
}

export { trainingState };
