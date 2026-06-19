import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { getPythonBin, SCRIPTS_DIR } from "@/lib/python";

const execFileAsync = promisify(execFile);
const PYTHON_BIN = getPythonBin();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const genre = body.genre || "classical";
    const length = String(body.length || 100);
    const temperature = String(body.temperature || 1.0);
    const instrument = body.instrument || "piano";
    const key = body.key || "C";
    const tempo = String(body.tempo || 120);

    const { stdout } = await execFileAsync(PYTHON_BIN, [
      path.join(SCRIPTS_DIR, "generator.py"),
      genre, length, temperature, instrument, key, tempo,
    ], { timeout: 60000, maxBuffer: 5 * 1024 * 1024 });

    const data = JSON.parse(stdout);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("LSTM generation error:", error.message);
    return NextResponse.json(
      { error: "LSTM generation failed. Make sure a model is trained for this genre.", details: error.message?.slice(-200) },
      { status: 500 }
    );
  }
}
