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
    const count = String(body.count || 50);

    const { stdout } = await execFileAsync(PYTHON_BIN, [
      path.join(SCRIPTS_DIR, "data_collector.py"),
      genre, count,
    ], { timeout: 60000, maxBuffer: 5 * 1024 * 1024 });

    const data = JSON.parse(stdout);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Data collection error:", error.message);
    return NextResponse.json(
      { error: "Data collection failed", details: error.message?.slice(-200) },
      { status: 500 }
    );
  }
}
