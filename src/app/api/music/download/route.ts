import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const GENERATED_DIR = path.join(process.cwd(), "mini-services", "music-ai-service", "data", "generated");
const MIDI_DIR = path.join(process.cwd(), "mini-services", "music-ai-service", "data", "midi");

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const file = url.searchParams.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file specified" }, { status: 400 });
    }

    // Sanitize filename - prevent directory traversal
    const safeName = path.basename(file);

    // Try generated directory first
    let filePath = path.join(GENERATED_DIR, safeName);
    let data: Buffer;

    try {
      data = await readFile(filePath);
    } catch {
      // Try midi directory
      filePath = path.join(MIDI_DIR, safeName);
      try {
        data = await readFile(filePath);
      } catch {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
    }

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "audio/midi",
        "Content-Disposition": `attachment; filename="${safeName}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Download failed", details: error.message },
      { status: 500 }
    );
  }
}
