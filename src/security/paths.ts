import * as path from "node:path";
export function isPathSafe(filePath: string, workspace: string): boolean {
  const resolved = path.resolve(workspace, filePath);
  return (
    resolved.startsWith(path.resolve(workspace) + path.sep) ||
    resolved === path.resolve(workspace)
  );
}
export function preventTraversal(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  return !normalized.startsWith("..") && !normalized.includes("..");
}
