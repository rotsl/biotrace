import { redactSecrets, isExcludedPath } from "../utils/patterns";
export interface SanitisedContent {
  changedFiles: string[];
  patchContent: string;
  excludedFiles: string[];
}
const BINARY_EXT = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".bz2",
  ".fastq",
  ".fq",
  ".bam",
  ".cram",
  ".h5ad",
  ".rds",
  ".RData",
  ".mp3",
  ".mp4",
];
export function sanitiseForAI(
  changedFiles: string[],
  patch: string,
  neverSend: string[],
  maxFiles: number,
  maxBytes: number,
): SanitisedContent {
  const excluded: string[] = [];
  const included = changedFiles
    .filter((f) => {
      if (isExcludedPath(f, neverSend)) {
        excluded.push(f);
        return false;
      }
      return true;
    })
    .slice(0, maxFiles);
  if (included.length < changedFiles.filter((f) => !isExcludedPath(f, neverSend)).length)
    excluded.push(
      ...changedFiles.filter((f) => !isExcludedPath(f, neverSend)).slice(maxFiles),
    );
  let p = redactSecrets(patch);
  const lines = p.split("\n");
  const filtered: string[] = [];
  let skip = false;
  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const m = line.match(/b\/(.+)$/);
      if (m) {
        const fp = m[1]!;
        const ext = fp.substring(fp.lastIndexOf(".")).toLowerCase();
        if (BINARY_EXT.includes(ext) || isExcludedPath(fp, neverSend)) {
          skip = true;
          excluded.push(fp);
          continue;
        }
      }
      skip = false;
    }
    if (!skip) filtered.push(line);
  }
  p = filtered.join("\n");
  if (p.length > maxBytes) p = p.substring(0, maxBytes) + "\n...(truncated)";
  p = p.replace(/([A-Z_]+)=(["']?)([^"'\s,}]+)\2/g, "$1=$2[REDACTED]$2");
  return { changedFiles: included, patchContent: p, excludedFiles: excluded };
}
