import { describe, it, expect, vi, beforeEach } from "vitest";
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

vi.mock("@actions/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@actions/core")>();
  return {
    ...actual,
    startGroup: vi.fn(),
    endGroup: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
});

describe("logging wrappers", () => {
  beforeEach(() => {
    vi.mocked(core.startGroup).mockClear();
    vi.mocked(core.endGroup).mockClear();
    vi.mocked(core.info).mockClear();
    vi.mocked(core.warning).mockClear();
    vi.mocked(core.error).mockClear();
    vi.mocked(core.debug).mockClear();
  });

  it("logGroup wraps fn in startGroup/endGroup, even on throw", () => {
    let ran = false;
    logGroup("g", () => {
      ran = true;
    });
    expect(core.startGroup).toHaveBeenCalledWith("g");
    expect(ran).toBe(true);
    expect(core.endGroup).toHaveBeenCalled();

    expect(() =>
      logGroup("g2", () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(core.endGroup).toHaveBeenCalledTimes(2);
  });

  it("delegates info/warning/error/debug to @actions/core", () => {
    logInfo("i");
    logWarning("w");
    logError("e");
    logDebug("d");
    expect(core.info).toHaveBeenCalledWith("i");
    expect(core.warning).toHaveBeenCalledWith("w");
    expect(core.error).toHaveBeenCalledWith("e");
    expect(core.debug).toHaveBeenCalledWith("d");
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
