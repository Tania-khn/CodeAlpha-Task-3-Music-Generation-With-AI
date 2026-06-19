import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://localhost:3002/api/samples");
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Fallback sample data if service is down
    return NextResponse.json({
      samples: {
        classical: [
          { id: "classical_1", name: "Moonlight Sonata Style", genre: "classical", tempo: 72, key: "C#", instrument: "piano", description: "Gentle arpeggiated patterns inspired by Beethoven", duration: "2:30" },
          { id: "classical_2", name: "Waltz in A Minor", genre: "classical", tempo: 88, key: "A", instrument: "piano", description: "Elegant 3/4 time waltz with flowing melodies", duration: "2:00" },
          { id: "classical_3", name: "Baroque Fugue", genre: "classical", tempo: 96, key: "D", instrument: "violin", description: "Contrapuntal masterpiece with interweaving voices", duration: "2:45" },
        ],
        jazz: [
          { id: "jazz_1", name: "Smoky Room Blues", genre: "jazz", tempo: 112, key: "Bb", instrument: "saxophone", description: "Smooth bebop lines with extended harmonies", duration: "2:15" },
          { id: "jazz_2", name: "Late Night Swing", genre: "jazz", tempo: 128, key: "F", instrument: "piano", description: "Upbeat swing rhythm with walking bass patterns", duration: "1:50" },
          { id: "jazz_3", name: "Modal Vamp", genre: "jazz", tempo: 104, key: "D", instrument: "saxophone", description: "Dorian mode exploration with rich voicings", duration: "2:30" },
        ],
        blues: [
          { id: "blues_1", name: "Delta Dust", genre: "blues", tempo: 72, key: "E", instrument: "guitar", description: "Raw delta blues with slide guitar feel", duration: "2:40" },
          { id: "blues_2", name: "Chicago Shuffle", genre: "blues", tempo: 96, key: "A", instrument: "guitar", description: "Classic 12-bar shuffle with gritty tone", duration: "2:10" },
          { id: "blues_3", name: "Slow Burn", genre: "blues", tempo: 64, key: "G", instrument: "guitar", description: "Slow blues ballad with soulful bends", duration: "3:00" },
        ],
        pop: [
          { id: "pop_1", name: "Summer Anthem", genre: "pop", tempo: 120, key: "C", instrument: "piano", description: "Catchy pop hook with upbeat progression", duration: "1:45" },
          { id: "pop_2", name: "Midnight Drive", genre: "pop", tempo: 108, key: "G", instrument: "synth", description: "Dreamy synth-pop with nostalgic vibes", duration: "2:20" },
          { id: "pop_3", name: "Neon Lights", genre: "pop", tempo: 124, key: "A", instrument: "synth", description: "Energetic dance-pop with pulsing rhythm", duration: "1:55" },
        ],
        electronic: [
          { id: "electronic_1", name: "Digital Rain", genre: "electronic", tempo: 128, key: "A", instrument: "synth", description: "Atmospheric techno with arpeggiated synths", duration: "2:30" },
          { id: "electronic_2", name: "Pulse Engine", genre: "electronic", tempo: 140, key: "E", instrument: "synth", description: "High-energy EDM with driving bass lines", duration: "2:00" },
          { id: "electronic_3", name: "Cyberwave", genre: "electronic", tempo: 132, key: "C", instrument: "synth", description: "Synthwave retro-future with lush pads", duration: "2:15" },
        ],
      },
    });
  }
}
