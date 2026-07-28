import { safeReadFile } from "../utils/files";
export interface SeedResult {
  hasSeed: boolean;
  foundPatterns: string[];
}
export function checkSeeds(files: string[], patterns: string[], ws: string): SeedResult {
  const found: string[] = [];
  for (const f of files) {
    const c = safeReadFile(f, ws);
    if (c)
      for (const p of patterns) if (c.includes(p) && !found.includes(p)) found.push(p);
  }
  return { hasSeed: found.length > 0, foundPatterns: found };
}
