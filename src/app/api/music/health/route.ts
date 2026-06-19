import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

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

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "music-ai",
    models_trained: scanTrainedModels(),
  });
}
