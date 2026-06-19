/**
 * Cross-platform Python binary resolution.
 * Priority:
 *   1. PYTHON_BIN env var (explicit override)
 *   2. Local venv inside mini-services/music-ai-service/venv
 *   3. System python3 / python
 */
import path from "path";
import fs from "fs";

function venvPythonPath(): string | null {
  const isWindows = process.platform === "win32";
  const venvRoot = path.join(
    process.cwd(),
    "mini-services",
    "music-ai-service",
    "venv"
  );
  const candidate = isWindows
    ? path.join(venvRoot, "Scripts", "python.exe")
    : path.join(venvRoot, "bin", "python");
  try {
    if (fs.existsSync(candidate)) return candidate;
  } catch {}
  return null;
}

export function getPythonBin(): string {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  const venv = venvPythonPath();
  if (venv) return venv;
  return process.platform === "win32" ? "python" : "python3";
}

/** Directory where the Python AI scripts live. */
export const SCRIPTS_DIR = path.join(
  process.cwd(),
  "mini-services",
  "music-ai-service",
  "scripts"
);

/** Root of the music-ai-service (used as cwd for Python). */
export const AI_SERVICE_DIR = path.join(
  process.cwd(),
  "mini-services",
  "music-ai-service"
);
