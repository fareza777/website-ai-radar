import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const DATA_DIR = join(process.cwd(), "data");

export function dataPath(...parts: string[]): string {
  return join(DATA_DIR, ...parts);
}

/** Reads JSON; returns `fallback` when the file is missing. Corrupt JSON throws (never silently reset history). */
export function readJson<T>(file: string, fallback: T): T {
  if (!existsSync(file)) return fallback;
  const raw = readFileSync(file, "utf8");
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    throw new Error(`Corrupt JSON in ${file}: ${(err as Error).message}`);
  }
}

/** Writes pretty JSON only when content changed (keeps git diffs and Vercel rebuilds minimal). */
export function writeJson(file: string, value: unknown): boolean {
  const next = `${JSON.stringify(value, null, 2)}\n`;
  if (existsSync(file) && readFileSync(file, "utf8") === next) return false;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, next, "utf8");
  return true;
}
