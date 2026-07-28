import { glob } from "node:fs/promises";
import * as path from "node:path";

export async function globFiles(pattern: string, workspace: string): Promise<string[]> {
  const anchored = path.isAbsolute(pattern) ? pattern : path.join(workspace, pattern);
  const files: string[] = [];
  for await (const f of glob(anchored)) files.push(f);
  return files.sort();
}
