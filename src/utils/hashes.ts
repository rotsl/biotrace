import * as crypto from "node:crypto";
import * as fs from "node:fs";
export function sha256File(filePath: string): string | null {
  try {
    const data = fs.readFileSync(filePath);
    const hash = crypto.createHash("sha256");
    hash.update(data);
    return `sha256:${hash.digest("hex")}`;
  } catch {
    return null;
  }
}
export function sha256String(content: string): string {
  return `sha256:${crypto.createHash("sha256").update(content, "utf-8").digest("hex")}`;
}
