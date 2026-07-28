import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { loadConfig } from "../../src/config/load";

const examplesDir = path.resolve(__dirname, "../../examples");
const exampleDirs = fs
  .readdirSync(examplesDir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

describe("example configs", () => {
  it("found at least one example directory", () => {
    expect(exampleDirs.length).toBeGreaterThan(0);
  });
  for (const dir of exampleDirs) {
    it(`${dir}/.github/biotrace.yml validates against the config schema`, () => {
      const workspace = path.join(examplesDir, dir);
      const configPath = path.join(".github", "biotrace.yml");
      expect(fs.existsSync(path.join(workspace, configPath))).toBe(true);
      const config = loadConfig(configPath, workspace);
      expect(config.version).toBe(1);
    });
  }
});
