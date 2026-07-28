import { parseCsv } from "../utils/csv";
import { createFinding } from "../reporting/findings";
import type { Finding, Severity } from "../reporting/types";
import type { MetadataFileConfig } from "../config/types";
export function validateMetadataTable(
  config: MetadataFileConfig,
  workspace: string,
): Finding[] {
  const findings: Finding[] = [];
  const result = parseCsv(config.path, workspace, config.delimiter);
  for (const err of result.errors)
    findings.push(
      createFinding("metadata", "error", "CSV parse error", err, { path: config.path }),
    );
  if (result.headers.length === 0) {
    findings.push(
      createFinding("metadata", "error", "Empty metadata file", "No headers", {
        path: config.path,
      }),
    );
    return findings;
  }
  if (config.required_columns)
    for (const col of config.required_columns) {
      if (!result.headers.includes(col))
        findings.push(
          createFinding(
            "metadata",
            "error",
            "Missing required column",
            `"${col}" not found. Available: ${result.headers.join(", ")}`,
            { path: config.path, remediation: `Add column "${col}".` },
          ),
        );
    }
  if (config.non_null)
    for (const col of config.non_null) {
      if (!result.headers.includes(col)) continue;
      for (let i = 0; i < result.rows.length; i++) {
        if (result.rows[i]![col]!.trim() === "")
          findings.push(
            createFinding(
              "metadata",
              "error",
              "Null value in non-null column",
              `"${col}" empty at row ${i + 2}`,
              { path: config.path, startLine: i + 2 },
            ),
          );
      }
    }
  if (config.unique)
    for (const col of config.unique) {
      if (!result.headers.includes(col)) continue;
      const seen = new Map<string, number[]>();
      for (let i = 0; i < result.rows.length; i++) {
        const v = result.rows[i]![col]!.trim();
        if (!v) continue;
        if (!seen.has(v)) seen.set(v, []);
        seen.get(v)!.push(i + 2);
      }
      for (const [v, rows] of seen)
        if (rows.length > 1)
          findings.push(
            createFinding(
              "metadata",
              "error",
              "Duplicate value in unique column",
              `"${col}" duplicate "${v}" at rows: ${rows.join(", ")}`,
              { path: config.path, label: "metadata:duplicate-samples" },
            ),
          );
    }
  if (config.allowed_values)
    for (const [col, allowed] of Object.entries(config.allowed_values)) {
      if (!result.headers.includes(col)) continue;
      for (let i = 0; i < result.rows.length; i++) {
        const v = result.rows[i]![col]!.trim();
        if (!v) continue;
        if (!allowed.includes(v))
          findings.push(
            createFinding(
              "metadata",
              "warning",
              "Unexpected value",
              `"${col}"="${v}" at row ${i + 2}. Allowed: ${allowed.join(", ")}`,
              { path: config.path, startLine: i + 2, label: "metadata:mismatch" },
            ),
          );
      }
    }
  if (config.minimum_group_size) {
    const { group_by, value: min, severity: sev = "warning" } = config.minimum_group_size;
    if (result.headers.includes(group_by)) {
      const groups = new Map<string, number>();
      for (const row of result.rows) {
        const v = row[group_by]!.trim();
        if (v) groups.set(v, (groups.get(v) ?? 0) + 1);
      }
      for (const [g, c] of groups)
        if (c < min)
          findings.push(
            createFinding(
              "metadata",
              sev as Severity,
              "Group below minimum",
              `"${g}" in "${group_by}" has ${c} < ${min}`,
              { path: config.path },
            ),
          );
    }
  }
  if (
    findings.filter((f) => f.severity === "error").length === 0 &&
    findings.filter((f) => f.severity === "warning").length === 0
  )
    findings.push(
      createFinding(
        "metadata",
        "info",
        "Metadata valid",
        `${config.path}: ${result.rowCount} rows, ${result.columnCount} cols`,
        { path: config.path, label: "metadata:valid" },
      ),
    );
  return findings;
}
