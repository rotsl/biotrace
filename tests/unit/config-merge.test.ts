import { describe, it, expect, beforeEach } from "vitest";
import { loadConfig } from "../../src/config/load";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-config-merge-"));
});

function write(yaml: string): void {
  fs.writeFileSync(path.join(tmpDir, "bt.yml"), yaml);
}

describe("loadConfig merging with defaults", () => {
  it("merges a partial files block on top of the defaults", () => {
    write(
      [
        "version: 1",
        "files:",
        "  metadata:",
        "    - path: data.csv",
        "      required_columns: [a]",
      ].join("\n"),
    );
    const cfg = loadConfig("bt.yml", tmpDir);
    expect(cfg.files?.metadata?.[0]?.path).toBe("data.csv");
  });

  it("overrides only the specified reproducibility weight, keeping the rest default", () => {
    write(
      ["version: 1", "reproducibility:", "  weights:", "    random_seed: 25"].join("\n"),
    );
    const cfg = loadConfig("bt.yml", tmpDir);
    expect(cfg.reproducibility?.weights?.random_seed).toBe(25);
    expect(cfg.reproducibility?.weights?.environment_definition).toBe(15);
  });

  it("overrides only the specified label colour category, keeping the rest default", () => {
    write(["version: 1", "labels:", "  colours:", "    passed: 00ff00"].join("\n"));
    const cfg = loadConfig("bt.yml", tmpDir);
    expect(cfg.labels?.colours?.passed).toBe("00ff00");
    expect(cfg.labels?.colours?.warning).toBe("bf8700");
  });

  it("merges a partial comment block on top of the defaults", () => {
    write(["version: 1", "comment:", "  mode: disabled"].join("\n"));
    const cfg = loadConfig("bt.yml", tmpDir);
    expect(cfg.comment?.mode).toBe("disabled");
    expect(cfg.comment?.maximum_findings).toBe(30);
  });

  it("appends configured never_send patterns to the defaults rather than replacing them", () => {
    write(["version: 1", "ai:", "  never_send:", "    - custom/**"].join("\n"));
    const cfg = loadConfig("bt.yml", tmpDir);
    expect(cfg.ai?.never_send).toContain("custom/**");
    expect(cfg.ai?.never_send).toContain("**/*.fastq");
  });

  it("throws a ConfigurationError with a readable message for invalid YAML", () => {
    write("version: 1\n  bad indentation:\nfoo");
    expect(() => loadConfig("bt.yml", tmpDir)).toThrow(/YAML parse error/);
  });

  it("throws when the config file is not a mapping", () => {
    write("- just\n- a\n- list\n");
    expect(() => loadConfig("bt.yml", tmpDir)).toThrow(/must be a YAML mapping/);
  });
});
