import type { BioTraceReport } from "./types";
export function escMd(t: string): string {
  return t
    .replace(/\\/g, "\\\\")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/`/g, "\\`")
    .replace(/\*/g, "\\*");
}
export function sevIcon(s: string): string {
  return s === "error" ? "❌" : s === "warning" ? "⚠️" : "✅";
}
export function generatePRComment(
  report: BioTraceReport,
  includePassed: boolean,
  maxFindings: number,
): string {
  const lines: string[] = [];
  lines.push("## BioTrace report\n");
  lines.push(`**Status:** ${sevIcon(report.status)} ${escMd(report.status)}`);
  lines.push(`**Reproducibility:** ${report.score.reproducibility}/100`);
  lines.push(
    `**Files checked:** ${report.summary.files_checked} | **Claims:** ${report.summary.claims_checked} | **Figures:** ${report.summary.figures_checked}\n`,
  );
  const errors = report.findings.filter((f) => f.severity === "error");
  if (errors.length) {
    lines.push("### Blocking findings\n");
    for (const f of errors.slice(0, maxFindings))
      lines.push(
        `- ${sevIcon(f.severity)} **${escMd(f.title)}**${f.path ? ` \`${escMd(f.path)}\`` : ""}: ${escMd(f.message)}`,
      );
    if (errors.length > maxFindings)
      lines.push(`- ... and ${errors.length - maxFindings} more`);
    lines.push("");
  }
  const warnings = report.findings.filter((f) => f.severity === "warning");
  if (warnings.length) {
    lines.push("### Warnings\n");
    for (const f of warnings.slice(0, maxFindings))
      lines.push(
        `- ${sevIcon(f.severity)} **${escMd(f.title)}**${f.path ? ` \`${escMd(f.path)}\`` : ""}: ${escMd(f.message)}`,
      );
    if (warnings.length > maxFindings)
      lines.push(`- ... and ${warnings.length - maxFindings} more`);
    lines.push("");
  }
  if (includePassed) {
    const passed = report.findings.filter((f) => f.severity === "info");
    if (passed.length) {
      lines.push("### Verified checks\n");
      for (const f of passed)
        lines.push(`- ${sevIcon(f.severity)} **${escMd(f.title)}**`);
      lines.push("");
    }
  }
  if (report.ai.enabled && report.ai.observations?.length) {
    lines.push("### AI-assisted observations\n");
    lines.push("> **Advisory only** — AI does not override deterministic checks.\n");
    for (const o of report.ai.observations)
      lines.push(
        `- **${escMd(o.title)}** (conf: ${Math.round(o.confidence * 100)}%${o.requires_human_verification ? ", verify" : ""}): ${escMd(o.message)}`,
      );
    lines.push("");
  }
  if (report.score.components.length) {
    lines.push(
      "<details><summary>Reproducibility breakdown</summary>\n\n| Component | Weight | Result |\n|---|---|---|\n",
    );
    for (const c of report.score.components)
      lines.push(
        `| ${escMd(c.name)} | ${c.weight} | ${c.result === "passed" ? "✅" : c.result === "failed" ? "❌" : "—"} |`,
      );
    lines.push("\n</details>\n");
  }
  return lines.join("\n");
}
export function generateStepSummary(report: BioTraceReport): string {
  return `## BioTrace\n- Status: ${report.status}\n- Score: ${report.score.reproducibility}/100\n- Findings: ${report.summary.findings} (${report.summary.blocking_findings} blocking)\n`;
}
