import { describe, it, expect, beforeEach } from "vitest";
import { loadConfig, ConfigurationError } from "../../src/config/load";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "biotrace-"));
});
describe("loadConfig", () => {
  it("returns defaults when no config file exists", () => {
    const cfg = loadConfig("nonexistent.yml", tmpDir);
    expect(cfg.version).toBe(1);
  });
  it("loads valid version 1 config", () => {
    fs.writeFileSync(path.join(tmpDir, "bt.yml"), "version: 1\n");
    const cfg = loadConfig("bt.yml", tmpDir);
    expect(cfg.version).toBe(1);
  });
  it("rejects unsupported version", () => {
    fs.writeFileSync(path.join(tmpDir, "bt.yml"), "version: 2\n");
    expect(() => loadConfig("bt.yml", tmpDir)).toThrow(ConfigurationError);
  });
  it("rejects missing version", () => {
    fs.writeFileSync(path.join(tmpDir, "bt.yml"), "files: {}\n");
    expect(() => loadConfig("bt.yml", tmpDir)).toThrow(ConfigurationError);
  });
  it("rejects path traversal", () => {
    expect(() => loadConfig("../../etc/passwd", tmpDir)).toThrow();
  });
  it("rejects unknown properties", () => {
    fs.writeFileSync(path.join(tmpDir, "bt.yml"), "version: 1\nunknown_prop: true\n");
    expect(() => loadConfig("bt.yml", tmpDir)).toThrow();
  });
});
