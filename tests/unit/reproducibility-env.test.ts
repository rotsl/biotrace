import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { detectREnv } from "../../src/reproducibility/r";
import { checkContainers } from "../../src/reproducibility/containers";

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-renv-"));
});

describe("detectREnv", () => {
  it("reports nothing found in an empty workspace", () => {
    const result = detectREnv(tmpDir);
    expect(result).toEqual({
      hasEnvironment: false,
      hasLockFile: false,
      hasConstraints: false,
    });
  });

  it("detects DESCRIPTION as an environment definition", () => {
    fs.writeFileSync(path.join(tmpDir, "DESCRIPTION"), "Package: foo\nVersion: 1.0\n");
    const result = detectREnv(tmpDir);
    expect(result.hasEnvironment).toBe(true);
    expect(result.hasLockFile).toBe(false);
  });

  it("detects renv.lock as a lock file and as satisfying constraints", () => {
    fs.writeFileSync(path.join(tmpDir, "renv.lock"), "{}");
    const result = detectREnv(tmpDir);
    expect(result.hasEnvironment).toBe(true);
    expect(result.hasLockFile).toBe(true);
    expect(result.hasConstraints).toBe(true);
  });

  it("detects version-constrained dependencies in DESCRIPTION", () => {
    fs.writeFileSync(
      path.join(tmpDir, "DESCRIPTION"),
      "Package: foo\nImports: dplyr (>= 1.0.0)\n",
    );
    expect(detectREnv(tmpDir).hasConstraints).toBe(true);
  });
});

describe("checkContainers", () => {
  it("reports no Dockerfile in an empty workspace", () => {
    expect(checkContainers(tmpDir)).toEqual({
      hasDockerfile: false,
      usesUnboundedTag: false,
    });
  });

  it("flags a FROM ...:latest tag as unbounded", () => {
    fs.writeFileSync(
      path.join(tmpDir, "Dockerfile"),
      "FROM ubuntu:latest\nRUN echo hi\n",
    );
    expect(checkContainers(tmpDir)).toEqual({
      hasDockerfile: true,
      usesUnboundedTag: true,
    });
  });

  it("flags a FROM with no tag at all as unbounded", () => {
    fs.writeFileSync(path.join(tmpDir, "Dockerfile"), "FROM ubuntu\n");
    expect(checkContainers(tmpDir)).toEqual({
      hasDockerfile: true,
      usesUnboundedTag: true,
    });
  });

  it("does not flag a pinned tag", () => {
    fs.writeFileSync(path.join(tmpDir, "Dockerfile"), "FROM ubuntu:22.04\n");
    expect(checkContainers(tmpDir)).toEqual({
      hasDockerfile: true,
      usesUnboundedTag: false,
    });
  });

  it("does not flag FROM scratch", () => {
    fs.writeFileSync(path.join(tmpDir, "Dockerfile"), "FROM scratch\n");
    expect(checkContainers(tmpDir)).toEqual({
      hasDockerfile: true,
      usesUnboundedTag: false,
    });
  });
});
