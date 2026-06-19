import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    genres: [
      { id: "classical", name: "Classical", description: "Baroque, Classical, and Romantic era music patterns", icon: "🎻" },
      { id: "jazz", name: "Jazz", description: "Swing, bebop, and modal jazz patterns", icon: "🎷" },
      { id: "pop", name: "Pop", description: "Contemporary pop music chord progressions", icon: "🎤" },
      { id: "blues", name: "Blues", description: "12-bar blues and delta blues patterns", icon: "🎸" },
      { id: "electronic", name: "Electronic", description: "Synthesizer and electronic dance patterns", icon: "🎹" },
    ],
  });
}
