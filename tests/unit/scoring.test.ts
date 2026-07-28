import { describe, it, expect, beforeEach } from "vitest";
import { calculateReproducibilityScore } from "../../src/reproducibility/scoring";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-score-"));
});
describe("calculateReproducibilityScore", () => {
  it("returns 100 when all applicable checks pass", () => {
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "numpy>=1.0\n");
    fs.writeFileSync(path.join(tmpDir, "poetry.lock"), "");
    fs.writeFileSync(path.join(tmpDir, "analysis.py"), "");
    const r = calculateReproducibilityScore(
      {
        version: 1,
        repository: { languages: ["Python"] },
        reproducibility: { entrypoints: ["analysis.py"] },
      },
      tmpDir,
      [],
    );
    expect(r.score).toBe(100);
  });
  it("returns 0 when environment required but missing", () => {
    const r = calculateReproducibilityScore(
      {
        version: 1,
        reproducibility: {
          require_environment: true,
          require_lockfile: true,
          weights: { environment_definition: 15, dependency_lock: 15 },
        },
        repository: { languages: ["Python"] },
      },
      tmpDir,
      [],
    );
    expect(r.score).toBeLessThan(100);
  });
  it("detects requirements.txt", () => {
    fs.writeFileSync(path.join(tmpDir, "requirements.txt"), "numpy>=1.0\n");
    const r = calculateReproducibilityScore(
      {
        version: 1,
        reproducibility: { require_environment: true, require_lockfile: false },
        repository: { languages: ["Python"] },
      },
      tmpDir,
      [],
    );
    expect(r.components.find((c) => c.name === "environment_definition")?.result).toBe(
      "passed",
    );
  });
});
