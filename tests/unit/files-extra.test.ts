import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { safeReadFile, safeFileExists, ensureDirectory } from "../../src/utils/files";

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-files-"));
});

describe("safeReadFile", () => {
  it("reads a file within the workspace", () => {
    fs.writeFileSync(path.join(tmpDir, "f.txt"), "hello");
    expect(safeReadFile("f.txt", tmpDir)).toBe("hello");
  });

  it("rejects a path that escapes the workspace", () => {
    expect(safeReadFile("../outside.txt", tmpDir)).toBeNull();
  });

  it("returns null for a file exceeding the size limit", () => {
    fs.writeFileSync(path.join(tmpDir, "f.txt"), "hello world");
    expect(safeReadFile("f.txt", tmpDir, 3)).toBeNull();
  });

  it("returns null for a symlink that escapes the workspace", () => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-outside-"));
    const outsideFile = path.join(outsideDir, "secret.txt");
    fs.writeFileSync(outsideFile, "secret");
    const link = path.join(tmpDir, "link.txt");
    fs.symlinkSync(outsideFile, link);
    expect(safeReadFile("link.txt", tmpDir)).toBeNull();
  });

  it("follows a symlink that stays within the workspace", () => {
    fs.writeFileSync(path.join(tmpDir, "real.txt"), "inside");
    fs.symlinkSync(path.join(tmpDir, "real.txt"), path.join(tmpDir, "link.txt"));
    expect(safeReadFile("link.txt", tmpDir)).toBe("inside");
  });
});

describe("safeFileExists", () => {
  it("returns true for an existing file", () => {
    fs.writeFileSync(path.join(tmpDir, "f.txt"), "x");
    expect(safeFileExists("f.txt", tmpDir)).toBe(true);
  });
  it("returns false for a missing file", () => {
    expect(safeFileExists("missing.txt", tmpDir)).toBe(false);
  });
  it("returns false for a path that escapes the workspace", () => {
    expect(safeFileExists("../outside.txt", tmpDir)).toBe(false);
  });
  it("returns false for a symlink that escapes the workspace", () => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-outside-"));
    const outsideFile = path.join(outsideDir, "secret.txt");
    fs.writeFileSync(outsideFile, "secret");
    fs.symlinkSync(outsideFile, path.join(tmpDir, "link.txt"));
    expect(safeFileExists("link.txt", tmpDir)).toBe(false);
  });
});

describe("ensureDirectory", () => {
  it("creates nested directories as needed", () => {
    ensureDirectory("a/b/c/report.json", tmpDir);
    expect(fs.existsSync(path.join(tmpDir, "a/b/c"))).toBe(true);
  });
  it("throws when the target path escapes the workspace", () => {
    expect(() => ensureDirectory("../escape/report.json", tmpDir)).toThrow(
      /escapes workspace/,
    );
  });
});
