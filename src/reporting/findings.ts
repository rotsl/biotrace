import type { Finding, Severity, ModuleName } from "./types";
let counter = 0;
export function resetFindingCounter(): void {
  counter = 0;
}
export function createFinding(
  module: ModuleName,
  severity: Severity,
  title: string,
  message: string,
  opts: Partial<Finding> = {},
): Finding {
  counter++;
  return {
    id: `${module}-${String(counter).padStart(4, "0")}`,
    module,
    severity,
    title,
    message,
    deterministic: opts.deterministic ?? true,
    ...opts,
  };
}
export function severityRank(s: Severity): number {
  return s === "info" ? 0 : s === "warning" ? 1 : 2;
}
export function isBlocking(s: Severity, failOn: Severity): boolean {
  return severityRank(s) >= severityRank(failOn);
}
export function deduplicateFindings(fs: Finding[]): Finding[] {
  const seen = new Set<string>();
  return fs.filter((f) => {
    const k = `${f.module}:${f.title}:${f.path ?? ""}:${f.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
