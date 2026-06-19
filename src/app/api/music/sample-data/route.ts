import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const SAMPLES_DIR = path.join(process.cwd(), "mini-services", "music-ai-service", "data", "samples");

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const genre = url.searchParams.get("genre") || "classical";

  // Sanitize
  const safeGenre = genre.replace(/[^a-z]/g, "");

  try {
    const filePath = path.join(SAMPLES_DIR, `sample_${safeGenre}.json`);
    const data = await readFile(filePath, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    // Fallback: try the Bun service
    try {
      const res = await fetch(`http://localhost:3002/api/sample-data/${safeGenre}`);
      const data = await res.json();
      return NextResponse.json(data);
    } catch {
      return NextResponse.json(
        { error: "Sample data not available" },
        { status: 404 }
      );
    }
  }
}
