import { describe, it, expect, beforeEach } from "vitest";
import { validateFigure } from "../../src/validators/figures";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-fig-"));
});
describe("validateFigure", () => {
  it("detects missing figure", () => {
    const { findings } = validateFigure({ path: "missing.png" }, new Set(), tmpDir);
    expect(findings.some((f) => f.title === "Figure missing")).toBe(true);
  });
  it("detects stale figure", () => {
    fs.writeFileSync(path.join(tmpDir, "fig.png"), "x");
    const { findings } = validateFigure(
      { path: "fig.png", depends_on: ["data.csv"] },
      new Set(["data.csv"]),
      tmpDir,
    );
    expect(findings.some((f) => f.title === "Figure may be stale")).toBe(true);
  });
  it("detects missing sidecar when required", () => {
    fs.writeFileSync(path.join(tmpDir, "fig2.png"), "x");
    const { findings } = validateFigure(
      { path: "fig2.png", require_provenance_sidecar: true },
      new Set(),
      tmpDir,
    );
    expect(findings.some((f) => f.title === "Provenance missing")).toBe(true);
  });
  it("passes valid figure", () => {
    fs.writeFileSync(path.join(tmpDir, "fig3.png"), "x");
    const { findings } = validateFigure({ path: "fig3.png" }, new Set(), tmpDir);
    expect(findings.some((f) => f.title === "Figure verified")).toBe(true);
  });
});
