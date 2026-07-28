import * as core from "@actions/core";
import type { Finding } from "../reporting/types";
export function createAnnotations(findings: Finding[]): void {
  const max = 50;
  for (const f of findings.filter((f) => f.severity !== "info" && f.path).slice(0, max)) {
    const props: core.AnnotationProperties = {
      title: f.title,
      file: f.path,
      startLine: f.startLine,
      endLine: f.endLine,
    };
    if (f.severity === "error") core.error(f.message, props);
    else if (f.severity === "warning") core.warning(f.message, props);
  }
}
