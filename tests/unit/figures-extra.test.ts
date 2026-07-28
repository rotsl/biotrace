import { describe, it, expect, beforeEach } from "vitest";
import { validateFigure } from "../../src/validators/figures";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { sha256File } from "../../src/utils/hashes";

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-fig2-"));
});

describe("validateFigure sidecar handling", () => {
  it("accepts a valid, matching sidecar with unchanged hashes", () => {
    fs.writeFileSync(path.join(tmpDir, "fig.png"), "x");
    fs.writeFileSync(path.join(tmpDir, "data.csv"), "gene,val\nIL6,1\n");
    const hash = sha256File(path.join(tmpDir, "data.csv"));
    fs.writeFileSync(
      path.join(tmpDir, "fig.png.biotrace.json"),
      JSON.stringify({
        schema_version: "1.0",
        figure: "fig.png",
        inputs: { "data.csv": hash },
      }),
    );
    const { findings, hasProvenance } = validateFigure(
      { path: "fig.png" },
      new Set(),
      tmpDir,
    );
    expect(hasProvenance).toBe(true);
    expect(findings.some((f) => f.severity !== "info")).toBe(false);
    expect(findings.some((f) => f.title === "Figure verified")).toBe(true);
  });

  it("flags an invalid sidecar missing required fields", () => {
    fs.writeFileSync(path.join(tmpDir, "fig.png"), "x");
    fs.writeFileSync(path.join(tmpDir, "fig.png.biotrace.json"), JSON.stringify({}));
    const { findings } = validateFigure({ path: "fig.png" }, new Set(), tmpDir);
    expect(findings.some((f) => f.title === "Invalid sidecar")).toBe(true);
  });

  it("flags a sidecar whose figure path doesn't match", () => {
    fs.writeFileSync(path.join(tmpDir, "fig.png"), "x");
    fs.writeFileSync(
      path.join(tmpDir, "fig.png.biotrace.json"),
      JSON.stringify({ schema_version: "1.0", figure: "other.png" }),
    );
    const { findings } = validateFigure({ path: "fig.png" }, new Set(), tmpDir);
    expect(findings.some((f) => f.title === "Sidecar path mismatch")).toBe(true);
  });

  it("flags a changed input hash", () => {
    fs.writeFileSync(path.join(tmpDir, "fig.png"), "x");
    fs.writeFileSync(path.join(tmpDir, "data.csv"), "gene,val\nIL6,1\n");
    fs.writeFileSync(
      path.join(tmpDir, "fig.png.biotrace.json"),
      JSON.stringify({
        schema_version: "1.0",
        figure: "fig.png",
        inputs: { "data.csv": "sha256:deadbeef" },
      }),
    );
    const { findings } = validateFigure({ path: "fig.png" }, new Set(), tmpDir);
    expect(findings.some((f) => f.title === "Input hash changed")).toBe(true);
  });

  it("flags a changed environment hash", () => {
    fs.writeFileSync(path.join(tmpDir, "fig.png"), "x");
    fs.writeFileSync(path.join(tmpDir, "renv.lock"), "{}");
    fs.writeFileSync(
      path.join(tmpDir, "fig.png.biotrace.json"),
      JSON.stringify({
        schema_version: "1.0",
        figure: "fig.png",
        environment: { "renv.lock": "sha256:deadbeef" },
      }),
    );
    const { findings } = validateFigure({ path: "fig.png" }, new Set(), tmpDir);
    expect(findings.some((f) => f.title === "Env hash changed")).toBe(true);
  });

  it("flags invalid sidecar JSON", () => {
    fs.writeFileSync(path.join(tmpDir, "fig.png"), "x");
    fs.writeFileSync(path.join(tmpDir, "fig.png.biotrace.json"), "not json");
    const { findings } = validateFigure({ path: "fig.png" }, new Set(), tmpDir);
    expect(findings.some((f) => f.title === "Invalid sidecar JSON")).toBe(true);
  });

  it("reports a missing caption file", () => {
    fs.writeFileSync(path.join(tmpDir, "fig.png"), "x");
    const { findings } = validateFigure(
      { path: "fig.png", caption: { path: "missing.md" } },
      new Set(),
      tmpDir,
    );
    expect(findings.some((f) => f.title === "Caption not found")).toBe(true);
  });

  it("reports a missing caption marker", () => {
    fs.writeFileSync(path.join(tmpDir, "fig.png"), "x");
    fs.writeFileSync(path.join(tmpDir, "figures.md"), "no marker here\n");
    const { findings } = validateFigure(
      { path: "fig.png", caption: { path: "figures.md", marker: "figure-2" } },
      new Set(),
      tmpDir,
    );
    expect(findings.some((f) => f.title === "Caption marker not found")).toBe(true);
  });

  it("does not flag a caption marker that is present", () => {
    fs.writeFileSync(path.join(tmpDir, "fig.png"), "x");
    fs.writeFileSync(path.join(tmpDir, "figures.md"), "see figure-2 below\n");
    const { findings } = validateFigure(
      { path: "fig.png", caption: { path: "figures.md", marker: "figure-2" } },
      new Set(),
      tmpDir,
    );
    expect(findings.some((f) => f.title === "Caption marker not found")).toBe(false);
  });
});
