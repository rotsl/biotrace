import { describe, it, expect, beforeEach } from "vitest";
import { validateClaim } from "../../src/validators/claims";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-claim-"));
});
describe("validateClaim", () => {
  it("verifies a passing claim", () => {
    fs.writeFileSync(
      path.join(tmpDir, "de.csv"),
      "gene,log2FoldChange,padj\nIL6,1.7,0.005\nTNF,2.0,0.01\n",
    );
    fs.writeFileSync(path.join(tmpDir, "ms.md"), "Results: BIOTRACE:il6-effect\n");
    const { result } = validateClaim(
      {
        id: "il6",
        source: { path: "ms.md", marker: "BIOTRACE:il6-effect" },
        evidence: { path: "de.csv", match: { gene: "IL6" } },
        assertions: [
          { field: "log2FoldChange", operator: ">=", value: 1.7 },
          { field: "padj", operator: "<", value: 0.01 },
        ],
      },
      tmpDir,
    );
    expect(result.status).toBe("verified");
  });
  it("detects failed assertion", () => {
    fs.writeFileSync(
      path.join(tmpDir, "de.csv"),
      "gene,log2FoldChange,padj\nIL6,0.5,0.5\n",
    );
    fs.writeFileSync(path.join(tmpDir, "ms.md"), "Results\n");
    const { result } = validateClaim(
      {
        id: "il6",
        source: { path: "ms.md" },
        evidence: { path: "de.csv", match: { gene: "IL6" } },
        assertions: [{ field: "log2FoldChange", operator: ">=", value: 1.7 }],
      },
      tmpDir,
    );
    expect(result.status).toBe("failed");
  });
  it("detects missing evidence row", () => {
    fs.writeFileSync(path.join(tmpDir, "de.csv"), "gene,log2FoldChange\nTNF,2.0\n");
    fs.writeFileSync(path.join(tmpDir, "ms.md"), "Results\n");
    const { result } = validateClaim(
      {
        id: "il6",
        source: { path: "ms.md" },
        evidence: { path: "de.csv", match: { gene: "IL6" } },
        assertions: [{ field: "log2FoldChange", operator: ">=", value: 1.7 }],
      },
      tmpDir,
    );
    expect(result.status).toBe("missing_evidence");
  });
  it("supports string equality", () => {
    fs.writeFileSync(path.join(tmpDir, "de.csv"), "gene,status\nIL6,significant\n");
    fs.writeFileSync(path.join(tmpDir, "ms.md"), "Results\n");
    const { result } = validateClaim(
      {
        id: "il6-status",
        source: { path: "ms.md" },
        evidence: { path: "de.csv", match: { gene: "IL6" } },
        assertions: [{ field: "status", operator: "==", value: "significant" }],
      },
      tmpDir,
    );
    expect(result.status).toBe("verified");
  });
});
