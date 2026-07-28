import type { Finding, Severity } from "./types";
import { isBlocking } from "./findings";
export function determineStatus(
  findings: Finding[],
  failOn: Severity,
): "passed" | "warning" | "error" | "info" {
  const hasError = findings.some((f) => isBlocking(f.severity, failOn));
  const hasWarning = findings.some((f) => f.severity === "warning");
  if (hasError) return "error";
  if (hasWarning) return "warning";
  return "passed";
}
