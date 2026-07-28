import { describe, it, expect, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as core from "@actions/core";
import {
  logGroup,
  logInfo,
  logWarning,
  logError,
  logDebug,
} from "../../src/utils/logging";
import { sha256File, sha256String } from "../../src/utils/hashes";

describe("logging wrappers", () => {
  it("logGroup wraps fn in startGroup/endGroup, even on throw", () => {
    const startSpy = vi.spyOn(core, "startGroup").mockImplementation(() => {});
    const endSpy = vi.spyOn(core, "endGroup").mockImplementation(() => {});
    let ran = false;
    logGroup("g", () => {
      ran = true;
    });
    expect(startSpy).toHaveBeenCalledWith("g");
    expect(ran).toBe(true);
    expect(endSpy).toHaveBeenCalled();

    expect(() =>
      logGroup("g2", () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(endSpy).toHaveBeenCalledTimes(2);
    startSpy.mockRestore();
    endSpy.mockRestore();
  });

  it("delegates info/warning/error/debug to @actions/core", () => {
    const infoSpy = vi.spyOn(core, "info").mockImplementation(() => {});
    const warnSpy = vi.spyOn(core, "warning").mockImplementation(() => {});
    const errSpy = vi.spyOn(core, "error").mockImplementation(() => {});
    const debugSpy = vi.spyOn(core, "debug").mockImplementation(() => {});
    logInfo("i");
    logWarning("w");
    logError("e");
    logDebug("d");
    expect(infoSpy).toHaveBeenCalledWith("i");
    expect(warnSpy).toHaveBeenCalledWith("w");
    expect(errSpy).toHaveBeenCalledWith("e");
    expect(debugSpy).toHaveBeenCalledWith("d");
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errSpy.mockRestore();
    debugSpy.mockRestore();
  });
});

describe("sha256File", () => {
  it("hashes a file's contents", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bt-hash-"));
    const file = path.join(tmp, "f.txt");
    fs.writeFileSync(file, "hello");
    const hash = sha256File(file);
    expect(hash).toBe(
      "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
  it("returns null when the file does not exist", () => {
    expect(sha256File("/nonexistent/path/does-not-exist")).toBeNull();
  });
});

describe("sha256String", () => {
  it("hashes a string", () => {
    expect(sha256String("hello")).toBe(
      "sha256:2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
