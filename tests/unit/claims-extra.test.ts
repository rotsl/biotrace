import { describe, it, expect, beforeEach } from "vitest";
import { validateClaim } from "../../src/validators/claims";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-claim2-"));
});

describe("validateClaim edge cases", () => {
  it("reports source not found", () => {
    const { findings, result } = validateClaim(
      {
        id: "x",
        source: { path: "missing.md" },
        evidence: { path: "de.csv" },
        assertions: [{ field: "a", operator: "==", value: "1" }],
      },
      tmpDir,
    );
    expect(result.status).toBe("error");
    expect(findings[0]?.title).toBe("Source not found");
  });

  it("reports marker not found", () => {
    fs.writeFileSync(path.join(tmpDir, "ms.md"), "no marker here\n");
    const { result } = validateClaim(
      {
        id: "x",
        source: { path: "ms.md", marker: "BIOTRACE:missing" },
        evidence: { path: "de.csv" },
        assertions: [{ field: "a", operator: "==", value: "1" }],
      },
      tmpDir,
    );
    expect(result.status).toBe("error");
  });

  it("reports evidence not found", () => {
    fs.writeFileSync(path.join(tmpDir, "ms.md"), "ok\n");
    const { result } = validateClaim(
      {
        id: "x",
        source: { path: "ms.md" },
        evidence: { path: "missing.csv" },
        assertions: [{ field: "a", operator: "==", value: "1" }],
      },
      tmpDir,
    );
    expect(result.status).toBe("missing_evidence");
  });

  it("reports an ambiguous match when multiple rows match", () => {
    fs.writeFileSync(path.join(tmpDir, "ms.md"), "ok\n");
    fs.writeFileSync(path.join(tmpDir, "de.csv"), "gene,val\nIL6,1\nIL6,2\n");
    const { findings, result } = validateClaim(
      {
        id: "x",
        source: { path: "ms.md" },
        evidence: { path: "de.csv", match: { gene: "IL6" } },
        assertions: [{ field: "val", operator: "==", value: "1" }],
      },
      tmpDir,
    );
    expect(findings.some((f) => f.title === "Ambiguous match")).toBe(true);
    expect(result.status).toBe("verified");
  });

  it("marks a claim failed when the field is missing from the matched row", () => {
    fs.writeFileSync(path.join(tmpDir, "ms.md"), "ok\n");
    fs.writeFileSync(path.join(tmpDir, "de.csv"), "gene\nIL6\n");
    const { result } = validateClaim(
      {
        id: "x",
        source: { path: "ms.md" },
        evidence: { path: "de.csv", match: { gene: "IL6" } },
        assertions: [{ field: "missingField", operator: "==", value: "1" }],
      },
      tmpDir,
    );
    expect(result.status).toBe("failed");
    expect(result.assertions[0]?.observed).toBeNull();
  });

  const operatorCases: Array<[string, unknown, string, boolean]> = [
    ["!=", "2", "1", true],
    ["!=", "1", "1", false],
    [">", "1.5", "1.7", true],
    ["<", "1.5", "1.7", false],
    ["<=", "1.5", "1.5", true],
    ["in", ["a", "b"], "a", true],
    ["in", ["a", "b"], "c", false],
    ["not_in", ["a", "b"], "c", true],
    ["not_in", ["a", "b"], "a", false],
    ["matches", "^IL", "IL6", true],
    ["matches", "^TNF", "IL6", false],
    ["matches", "(unclosed", "IL6", false],
  ];
  for (const [operator, value, observed, expected] of operatorCases) {
    it(`evaluates ${operator} with value=${JSON.stringify(value)} observed=${observed} -> ${expected}`, () => {
      fs.writeFileSync(path.join(tmpDir, "ms.md"), "ok\n");
      fs.writeFileSync(path.join(tmpDir, "de.csv"), `gene,val\nIL6,${observed}\n`);
      const { result } = validateClaim(
        {
          id: "x",
          source: { path: "ms.md" },
          evidence: { path: "de.csv", match: { gene: "IL6" } },
          assertions: [{ field: "val", operator: operator as never, value }],
        },
        tmpDir,
      );
      expect(result.assertions[0]?.passed).toBe(expected);
    });
  }
});
