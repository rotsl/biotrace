import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { globFiles } from "../../src/utils/glob";

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-globutil-"));
});

describe("globFiles", () => {
  it("anchors a relative pattern to the workspace and sorts results", async () => {
    fs.mkdirSync(path.join(tmpDir, "data"));
    fs.writeFileSync(path.join(tmpDir, "data", "b.fa"), "x");
    fs.writeFileSync(path.join(tmpDir, "data", "a.fa"), "x");
    const files = await globFiles("data/*.fa", tmpDir);
    expect(files).toEqual([
      path.join(tmpDir, "data", "a.fa"),
      path.join(tmpDir, "data", "b.fa"),
    ]);
  });

  it("matches recursive ** patterns", async () => {
    fs.mkdirSync(path.join(tmpDir, "references", "sub"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "references", "top.fa"), "x");
    fs.writeFileSync(path.join(tmpDir, "references", "sub", "nested.fa"), "x");
    const files = await globFiles("references/**/*.fa", tmpDir);
    expect(files.sort()).toEqual(
      [
        path.join(tmpDir, "references", "sub", "nested.fa"),
        path.join(tmpDir, "references", "top.fa"),
      ].sort(),
    );
  });

  it("uses an already-absolute pattern as-is, ignoring the workspace", async () => {
    const otherDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-globutil2-"));
    fs.writeFileSync(path.join(otherDir, "x.fa"), "x");
    const absolutePattern = path.join(otherDir, "*.fa");
    const files = await globFiles(absolutePattern, tmpDir);
    expect(files).toEqual([path.join(otherDir, "x.fa")]);
  });

  it("returns an empty array when nothing matches", async () => {
    const files = await globFiles("nope/*.fa", tmpDir);
    expect(files).toEqual([]);
  });
});
