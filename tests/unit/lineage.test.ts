import { describe, it, expect, beforeEach } from "vitest";
import { validateLineage } from "../../src/validators/lineage";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-lin-"));
});
describe("validateLineage", () => {
  it("detects stale output when input changed", () => {
    fs.writeFileSync(path.join(tmpDir, "input.csv"), "x");
    const f = validateLineage(
      {
        id: "test",
        inputs: ["input.csv"],
        code: ["analysis.R"],
        outputs: ["output.csv"],
      },
      new Set(["input.csv"]),
      tmpDir,
    );
    expect(f.some((x) => x.title === "Possible stale output")).toBe(true);
  });
  it("detects untraceable output", () => {
    fs.writeFileSync(path.join(tmpDir, "output.csv"), "x");
    const f = validateLineage(
      {
        id: "test",
        inputs: ["input.csv"],
        code: ["analysis.R"],
        outputs: ["output.csv"],
      },
      new Set(["output.csv"]),
      tmpDir,
    );
    expect(f.some((x) => x.title === "Output provenance unclear")).toBe(true);
  });
  it("passes when all traceable", () => {
    const f = validateLineage(
      {
        id: "test",
        inputs: ["input.csv"],
        code: ["analysis.R"],
        outputs: ["output.csv"],
      },
      new Set(),
      tmpDir,
    );
    expect(f.some((x) => x.title === "Lineage traceable")).toBe(true);
  });
});
