import { serve } from "bun";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

// ============ Python AI Music Generation Service ============

interface GenerationRequest {
  genre: string;
  length: number;
  temperature: number;
  instrument: string;
  key?: string;
  tempo?: number;
}

interface TrainRequest {
  genre: string;
  epochs: number;
  sequenceLength: number;
}

interface StatusResponse {
  status: string;
  models_trained: string[];
  message: string;
}

let trainingInProgress = false;
let trainedModels: string[] = [];
let trainingProgress = 0;
let trainingLog: string[] = [];

// Scan models directory on startup to detect pre-trained models
function loadTrainedModelsFromDisk(): string[] {
  const modelsDir = join(import.meta.dir, "data", "models");
  if (!existsSync(modelsDir)) return [];
  try {
    const files = readdirSync(modelsDir);
    const genres = files
      .filter(f => f.endsWith("_lstm.pt"))
      .map(f => f.replace("_lstm.pt", ""));
    return genres;
  } catch {
    return [];
  }
}

trainedModels = loadTrainedModelsFromDisk();

// Find Python binary - works on Windows, Mac, and Linux
function findPythonBin(): string {
  // 1. If PYTHON_BIN env var is set, use it
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;

  // 2. Check for local venv in the service directory (cross-platform)
  const isWindows = process.platform === "win32";
  const venvPython = isWindows
    ? `${import.meta.dir}/venv/Scripts/python.exe`
    : `${import.meta.dir}/venv/bin/python`;
  try {
    if (Bun.file(venvPython).size > 0) return venvPython;
  } catch {}

  // 3. Fallback to system python
  return isWindows ? "python" : "python3";
}

// Run Python script and return output
async function runPython(scriptPath: string, args: string[] = []): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const pythonBin = findPythonBin();
  const proc = Bun.spawn([pythonBin, scriptPath, ...args], {
    cwd: import.meta.dir,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  return { stdout, stderr, exitCode };
}

serve({
  port: 3002,
  async fetch(req) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === "/api/health") {
      return Response.json(
        { status: "ok", service: "music-ai", models_trained: trainedModels },
        { headers: corsHeaders }
      );
    }

    // Collect MIDI data (generate sample data)
    if (url.pathname === "/api/collect-data" && req.method === "POST") {
      try {
        const body = await req.json();
        const genre = body.genre || "classical";
        const count = body.count || 50;
        const result = await runPython("scripts/data_collector.py", [genre, count.toString()]);

        if (result.exitCode !== 0) {
          return Response.json(
            { error: "Data collection failed", details: result.stderr },
            { status: 500, headers: corsHeaders }
          );
        }

        const data = JSON.parse(result.stdout);
        return Response.json(data, { headers: corsHeaders });
      } catch (e: any) {
        return Response.json(
          { error: e.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Preprocess data
    if (url.pathname === "/api/preprocess" && req.method === "POST") {
      try {
        const body = await req.json();
        const genre = body.genre || "classical";
        const seqLen = body.sequenceLength || 32;
        const result = await runPython("scripts/preprocessor.py", [genre, seqLen.toString()]);

        if (result.exitCode !== 0) {
          return Response.json(
            { error: "Preprocessing failed", details: result.stderr },
            { status: 500, headers: corsHeaders }
          );
        }

        const data = JSON.parse(result.stdout);
        return Response.json(data, { headers: corsHeaders });
      } catch (e: any) {
        return Response.json(
          { error: e.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Train model
    if (url.pathname === "/api/train" && req.method === "POST") {
      if (trainingInProgress) {
        return Response.json(
          { error: "Training already in progress", progress: trainingProgress },
          { status: 409, headers: corsHeaders }
        );
      }

      try {
        const body: TrainRequest = await req.json();
        const genre = body.genre || "classical";
        const epochs = body.epochs || 50;
        const seqLen = body.sequenceLength || 32;

        trainingInProgress = true;
        trainingProgress = 0;
        trainingLog = [];

        // Run training asynchronously
        const trainPromise = runPython("scripts/trainer.py", [
          genre,
          epochs.toString(),
          seqLen.toString(),
        ]);

        trainPromise.then((result) => {
          trainingInProgress = false;
          if (result.exitCode === 0) {
            trainedModels.push(genre);
            trainingProgress = 100;
          } else {
            trainingLog.push(`Error: ${result.stderr.slice(-200)}`);
          }
        });

        return Response.json(
          { message: "Training started", genre, epochs },
          { headers: corsHeaders }
        );
      } catch (e: any) {
        trainingInProgress = false;
        return Response.json(
          { error: e.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Training status
    if (url.pathname === "/api/train-status") {
      return Response.json(
        {
          training: trainingInProgress,
          progress: trainingProgress,
          models: trainedModels,
          logs: trainingLog.slice(-10),
        },
        { headers: corsHeaders }
      );
    }

    // Generate music
    if (url.pathname === "/api/generate" && req.method === "POST") {
      try {
        const body: GenerationRequest = await req.json();
        const genre = body.genre || "classical";
        const length = body.length || 100;
        const temperature = body.temperature || 1.0;
        const instrument = body.instrument || "piano";
        const key = body.key || "C";
        const tempo = body.tempo || 120;

        const result = await runPython("scripts/generator.py", [
          genre,
          length.toString(),
          temperature.toString(),
          instrument,
          key,
          tempo.toString(),
        ]);

        if (result.exitCode !== 0) {
          return Response.json(
            { error: "Generation failed", details: result.stderr },
            { status: 500, headers: corsHeaders }
          );
        }

        const data = JSON.parse(result.stdout);
        return Response.json(data, { headers: corsHeaders });
      } catch (e: any) {
        return Response.json(
          { error: e.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Get available genres
    if (url.pathname === "/api/genres") {
      return Response.json(
        {
          genres: [
            { id: "classical", name: "Classical", description: "Baroque, Classical, and Romantic era music patterns", icon: "🎻" },
            { id: "jazz", name: "Jazz", description: "Swing, bebop, and modal jazz patterns", icon: "🎷" },
            { id: "pop", name: "Pop", description: "Contemporary pop music chord progressions", icon: "🎤" },
            { id: "blues", name: "Blues", description: "12-bar blues and delta blues patterns", icon: "🎸" },
            { id: "electronic", name: "Electronic", description: "Synthesizer and electronic dance patterns", icon: "🎹" },
          ],
        },
        { headers: corsHeaders }
      );
    }

    // Get dataset info
    if (url.pathname === "/api/dataset-info") {
      try {
        const result = await runPython("scripts/data_collector.py", ["info"]);
        if (result.exitCode === 0) {
          const data = JSON.parse(result.stdout);
          return Response.json(data, { headers: corsHeaders });
        }
      } catch (e: any) {
        // fallback
      }
      return Response.json(
        { files: 0, genres: [] },
        { headers: corsHeaders }
      );
    }

    // Quick generate (no training needed - uses algorithmic generation)
    if (url.pathname === "/api/quick-generate" && req.method === "POST") {
      try {
        const body = await req.json();
        const result = await runPython("scripts/quick_generator.py", [
          body.genre || "classical",
          (body.length || 64).toString(),
          (body.tempo || 120).toString(),
          body.key || "C",
          body.instrument || "piano",
          (body.temperature || 1.0).toString(),
        ]);

        if (result.exitCode !== 0) {
          return Response.json(
            { error: "Quick generation failed", details: result.stderr.slice(-500) },
            { status: 500, headers: corsHeaders }
          );
        }

        const data = JSON.parse(result.stdout);
        return Response.json(data, { headers: corsHeaders });
      } catch (e: any) {
        return Response.json(
          { error: e.message },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // Get sample tracks for all genres (pre-generated demo music)
    if (url.pathname === "/api/samples") {
      // Return pre-defined sample track metadata with note data
      // Each genre has 3 curated sample tracks
      const samples = {
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
      };

      return Response.json({ samples }, { headers: corsHeaders });
    }

    // Get pre-generated sample data for instant playback
    if (url.pathname.startsWith("/api/sample-data/")) {
      const genre = url.pathname.split("/").pop() || "classical";
      try {
        const samplePath = join(import.meta.dir, "data", "samples", `sample_${genre}.json`);
        const data = JSON.parse(readFileSync(samplePath, "utf-8"));
        return Response.json(data, { headers: corsHeaders });
      } catch {
        // Fallback: generate on the fly
        try {
          const result = await runPython("scripts/quick_generator.py", [
            genre, "64", "120", "C", "piano", "1.0",
          ]);
          if (result.exitCode === 0) {
            const data = JSON.parse(result.stdout);
            return Response.json(data, { headers: corsHeaders });
          }
        } catch {}
        return Response.json(
          { error: "Sample not available" },
          { status: 404, headers: corsHeaders }
        );
      }
    }

    return Response.json(
      { error: "Not found" },
      { status: 404, headers: corsHeaders }
    );
  },
});

console.log("🎵 Music AI Service running on port 3002");
