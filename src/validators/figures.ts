import { createFinding } from "../reporting/findings";
import type { Finding } from "../reporting/types";
import type { FigureConfig } from "../config/types";
import { safeReadFile, safeFileExists } from "../utils/files";
import { sha256File } from "../utils/hashes";
import * as path from "node:path";
interface SidecarData {
  schema_version: string;
  figure: string;
  inputs?: Record<string, string>;
  environment?: Record<string, string>;
  command?: string;
}
export function validateFigure(
  config: FigureConfig,
  changedFiles: Set<string>,
  workspace: string,
): { findings: Finding[]; hasProvenance: boolean } {
  const findings: Finding[] = [];
  const {
    path: fp,
    generated_by = [],
    depends_on = [],
    caption,
    require_provenance_sidecar = false,
  } = config;
  let hasProvenance = false;
  if (!safeFileExists(fp, workspace)) {
    findings.push(
      createFinding("figure", "warning", "Figure missing", `"${fp}"`, {
        path: fp,
        label: "figure:missing",
      }),
    );
    return { findings, hasProvenance };
  }
  const scPath = `${fp}.biotrace.json`;
  if (safeFileExists(scPath, workspace)) {
    hasProvenance = true;
    const scContent = safeReadFile(scPath, workspace);
    if (scContent) {
      try {
        const sc = JSON.parse(scContent) as SidecarData;
        if (!sc.schema_version || !sc.figure)
          findings.push(
            createFinding("figure", "warning", "Invalid sidecar", "Missing fields", {
              path: scPath,
            }),
          );
        else if (sc.figure !== fp)
          findings.push(
            createFinding(
              "figure",
              "warning",
              "Sidecar path mismatch",
              `"${sc.figure}" vs "${fp}"`,
              { path: scPath },
            ),
          );
        if (sc.inputs)
          for (const [ip, eh] of Object.entries(sc.inputs)) {
            const ch = sha256File(path.resolve(workspace, ip));
            if (ch && ch !== eh)
              findings.push(
                createFinding("figure", "warning", "Input hash changed", `"${ip}"`, {
                  path: fp,
                  label: "figure:stale",
                }),
              );
          }
        if (sc.environment)
          for (const [ep, eh] of Object.entries(sc.environment)) {
            const ch = sha256File(path.resolve(workspace, ep));
            if (ch && ch !== eh)
              findings.push(
                createFinding("figure", "warning", "Env hash changed", `"${ep}"`, {
                  path: fp,
                  label: "figure:stale",
                }),
              );
          }
      } catch {
        findings.push(
          createFinding("figure", "warning", "Invalid sidecar JSON", scPath, {
            path: scPath,
          }),
        );
      }
    }
  } else if (require_provenance_sidecar) {
    findings.push(
      createFinding("figure", "warning", "Provenance missing", `No sidecar: ${scPath}`, {
        path: fp,
        label: "figure:provenance-missing",
      }),
    );
  }
  const upstream =
    depends_on.some((d) => changedFiles.has(d)) ||
    generated_by.some((g) => changedFiles.has(g));
  if (upstream && !changedFiles.has(fp))
    findings.push(
      createFinding(
        "figure",
        "warning",
        "Figure may be stale",
        `Upstream changed but "${fp}" not updated`,
        { path: fp, label: "figure:stale", remediation: "Re-generate figure." },
      ),
    );
  if (caption) {
    const cc = safeReadFile(caption.path, workspace);
    if (!cc)
      findings.push(
        createFinding("figure", "info", "Caption not found", caption.path, {
          path: caption.path,
        }),
      );
    else if (caption.marker && !cc.includes(caption.marker))
      findings.push(
        createFinding("figure", "info", "Caption marker not found", caption.marker, {
          path: caption.path,
        }),
      );
  }
  if (
    findings.filter((f) => f.severity === "error" || f.severity === "warning").length ===
    0
  )
    findings.push(
      createFinding("figure", "info", "Figure verified", `"${fp}" passed`, {
        path: fp,
        label: "figure:verified",
      }),
    );
  return { findings, hasProvenance };
}
