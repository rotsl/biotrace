import { describe, it, expect } from "vitest";
import { isPathSafe, preventTraversal } from "../../src/security/paths";
import { redactSecrets } from "../../src/utils/patterns";
import { sanitiseForAI } from "../../src/ai/sanitise";
describe("Security", () => {
  it("isPathSafe rejects traversal", () => {
    expect(isPathSafe("../../etc/passwd", "/workspace")).toBe(false);
  });
  it("isPathSafe accepts normal paths", () => {
    expect(isPathSafe("data/file.csv", "/workspace")).toBe(true);
  });
  it("preventTraversal blocks .. paths", () => {
    expect(preventTraversal("../../../etc/passwd")).toBe(false);
  });
  it("redactSecrets redacts tokens", () => {
    expect(redactSecrets("key=ghp_1234567890123456789012345678901234")).toContain(
      "[REDACTED]",
    );
  });
  it("redactSecrets redacts private keys", () => {
    expect(redactSecrets("-----BEGIN RSA PRIVATE KEY-----")).toContain("[REDACTED]");
  });
  it("sanitiseForAI excludes binary files", () => {
    const s = sanitiseForAI(
      ["data/raw/file.fastq", "analysis/script.R"],
      "patch",
      ["data/raw/**", "**/*.fastq"],
      100,
      150000,
    );
    expect(s.excludedFiles).toContain("data/raw/file.fastq");
    expect(s.changedFiles).not.toContain("data/raw/file.fastq");
  });
  it("sanitiseForAI limits file count", () => {
    const s = sanitiseForAI(["a", "b", "c"], "patch", [], 2, 150000);
    expect(s.changedFiles.length).toBe(2);
  });
  it("sanitiseForAI redacts env vars", () => {
    const s = sanitiseForAI([], "MY_SECRET=abc123", [], 100, 150000);
    expect(s.patchContent).toContain("[REDACTED]");
  });
});
