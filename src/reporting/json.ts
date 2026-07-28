import * as fs from "node:fs";
import * as path from "node:path";
import type { BioTraceReport } from "./types";
import { ensureDirectory } from "../utils/files";
export function writeReport(
  report: BioTraceReport,
  outputPath: string,
  workspace: string,
): void {
  ensureDirectory(outputPath, workspace);
  const resolved = path.resolve(workspace, outputPath);
  fs.writeFileSync(resolved, JSON.stringify(report, null, 2), "utf-8");
}
