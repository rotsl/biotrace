import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { writeReport } from "../../src/reporting/json";
import {
  generatePRComment,
  generateStepSummary,
  escMd,
  sevIcon,
} from "../../src/reporting/markdown";
import { determineStatus } from "../../src/reporting/summary";
import type { BioTraceReport, Finding } from "../../src/reporting/types";

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-report-"));
});

function baseReport(overrides: Partial<BioTraceReport> = {}): BioTraceReport {
  return {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    status: "warning",
    score: {
      reproducibility: 82,
      components: [
        { name: "environment_definition", weight: 15, result: "passed", reason: "ok" },
      ],
    },
    summary: {
      files_checked: 2,
      claims_checked: 1,
      figures_checked: 1,
      findings: 2,
      blocking_findings: 0,
    },
    findings: [],
    claims: [],
    lineage: [],
    ai: { enabled: false, status: "disabled", advisory_only: true },
    ...overrides,
  };
}

describe("writeReport", () => {
  it("writes JSON to the given path, creating directories as needed", () => {
    writeReport(baseReport(), "out/nested/report.json", tmpDir);
    const written = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "out/nested/report.json"), "utf-8"),
    );
    expect(written.status).toBe("warning");
    expect(written.score.reproducibility).toBe(82);
  });
});

describe("markdown helpers", () => {
  it("escMd escapes markdown-significant characters", () => {
    expect(escMd("a & b < c > d * e `f`")).toBe("a &amp; b &lt; c &gt; d \\* e \\`f\\`");
  });
  it("escMd escapes a leading backslash so it can't neutralise a later escape", () => {
    // Without escaping backslashes first, input ending in "\`" would produce
    // "\\`" in the output, which renders as an escaped backslash followed by
    // an *unescaped* backtick, opening a code span the caller didn't intend.
    const result = escMd("\\`injected`");
    expect(result).toBe("\\\\\\`injected\\`");
  });
  it("sevIcon maps severities to icons", () => {
    expect(sevIcon("error")).toBe("❌");
    expect(sevIcon("warning")).toBe("⚠️");
    expect(sevIcon("info")).toBe("✅");
  });
});

describe("generateStepSummary", () => {
  it("includes status, score, and finding counts", () => {
    const summary = generateStepSummary(baseReport());
    expect(summary).toContain("Status: warning");
    expect(summary).toContain("Score: 82/100");
    expect(summary).toContain("Findings: 2 (0 blocking)");
  });
});

describe("generatePRComment", () => {
  const errorFinding: Finding = {
    id: "m-0001",
    module: "metadata",
    severity: "error",
    title: "Missing required column",
    message: "sample_id not found",
    path: "data.csv",
    deterministic: true,
  };
  const warningFinding: Finding = {
    id: "f-0001",
    module: "figure",
    severity: "warning",
    title: "Figure may be stale",
    message: "upstream changed",
    path: "fig.png",
    deterministic: true,
  };
  const infoFinding: Finding = {
    id: "m-0002",
    module: "metadata",
    severity: "info",
    title: "Metadata valid",
    message: "ok",
    deterministic: true,
  };

  it("lists blocking findings and warnings, and shows the score breakdown", () => {
    const report = baseReport({ findings: [errorFinding, warningFinding] });
    const comment = generatePRComment(report, false, 30);
    expect(comment).toContain("### Blocking findings");
    expect(comment).toContain("Missing required column");
    expect(comment).toContain("### Warnings");
    expect(comment).toContain("Figure may be stale");
    expect(comment).not.toContain("### Verified checks");
    expect(comment).toContain("Reproducibility breakdown");
    expect(comment).toContain("environment_definition");
  });

  it("includes verified checks only when includePassed is true", () => {
    const report = baseReport({ findings: [infoFinding] });
    expect(generatePRComment(report, false, 30)).not.toContain("### Verified checks");
    expect(generatePRComment(report, true, 30)).toContain("### Verified checks");
  });

  it("truncates findings beyond maxFindings and notes the overflow", () => {
    const findings = Array.from({ length: 5 }, (_, i) => ({
      ...errorFinding,
      id: `m-000${i}`,
      title: `Error ${i}`,
    }));
    const report = baseReport({ findings });
    const comment = generatePRComment(report, false, 2);
    expect(comment).toContain("Error 0");
    expect(comment).toContain("Error 1");
    expect(comment).not.toContain("Error 2");
    expect(comment).toContain("... and 3 more");
  });

  it("includes AI observations when present", () => {
    const report = baseReport({
      ai: {
        enabled: true,
        status: "completed",
        advisory_only: true,
        observations: [
          {
            title: "Drift",
            message: "possible drift",
            confidence: 0.9,
            paths: ["a.R"],
            requires_human_verification: true,
          },
        ],
      },
    });
    const comment = generatePRComment(report, false, 30);
    expect(comment).toContain("AI-assisted observations");
    expect(comment).toContain("Drift");
    expect(comment).toContain("conf: 90%");
    expect(comment).toContain("verify");
  });

  it("omits the AI section when AI is disabled", () => {
    const comment = generatePRComment(baseReport(), false, 30);
    expect(comment).not.toContain("AI-assisted observations");
  });
});

describe("determineStatus", () => {
  it("returns error when any finding meets or exceeds fail-on severity", () => {
    const findings: Finding[] = [
      {
        id: "x",
        module: "metadata",
        severity: "error",
        title: "t",
        message: "m",
        deterministic: true,
      },
    ];
    expect(determineStatus(findings, "error")).toBe("error");
  });
  it("returns error for a warning finding when fail-on is warning", () => {
    const findings: Finding[] = [
      {
        id: "x",
        module: "metadata",
        severity: "warning",
        title: "t",
        message: "m",
        deterministic: true,
      },
    ];
    expect(determineStatus(findings, "warning")).toBe("error");
  });
  it("returns warning when there's a warning but fail-on is error", () => {
    const findings: Finding[] = [
      {
        id: "x",
        module: "metadata",
        severity: "warning",
        title: "t",
        message: "m",
        deterministic: true,
      },
    ];
    expect(determineStatus(findings, "error")).toBe("warning");
  });
  it("returns passed when there are no warnings or blocking errors", () => {
    const findings: Finding[] = [
      {
        id: "x",
        module: "metadata",
        severity: "info",
        title: "t",
        message: "m",
        deterministic: true,
      },
    ];
    expect(determineStatus(findings, "error")).toBe("passed");
  });
});
