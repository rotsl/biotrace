import * as fs from "node:fs";
import * as path from "node:path";
const MAX_FILE_SIZE = 100 * 1024 * 1024;
export function safeReadFile(
  filePath: string,
  workspace: string,
  maxSize = MAX_FILE_SIZE,
): string | null {
  const resolved = path.resolve(workspace, filePath);
  if (
    !resolved.startsWith(path.resolve(workspace) + path.sep) &&
    resolved !== path.resolve(workspace)
  )
    return null;
  try {
    const lstat = fs.lstatSync(resolved, { throwIfNoEntry: false });
    if (!lstat) return null;
    if (lstat.isSymbolicLink() && !isWithinRealWorkspace(resolved, workspace))
      return null;
    const stat = fs.statSync(resolved, { throwIfNoEntry: false });
    if (!stat) return null;
    if (stat.size > maxSize) return null;
    return fs.readFileSync(resolved, "utf-8");
  } catch {
    return null;
  }
}
function isWithinRealWorkspace(resolved: string, workspace: string): boolean {
  const real = fs.realpathSync(resolved);
  const realWorkspace = fs.realpathSync(path.resolve(workspace));
  return real === realWorkspace || real.startsWith(realWorkspace + path.sep);
}
export function safeFileExists(filePath: string, workspace: string): boolean {
  const resolved = path.resolve(workspace, filePath);
  if (
    !resolved.startsWith(path.resolve(workspace) + path.sep) &&
    resolved !== path.resolve(workspace)
  )
    return false;
  try {
    const lstat = fs.lstatSync(resolved, { throwIfNoEntry: false });
    if (!lstat) return false;
    if (lstat.isSymbolicLink() && !isWithinRealWorkspace(resolved, workspace))
      return false;
    return true;
  } catch {
    return false;
  }
}
export function ensureDirectory(filePath: string, workspace: string): void {
  const resolved = path.resolve(workspace, filePath);
  if (!resolved.startsWith(path.resolve(workspace) + path.sep))
    throw new Error(`Path escapes workspace: ${filePath}`);
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
