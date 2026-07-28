import { describe, it, expect, vi, beforeEach } from "vitest";
import * as core from "@actions/core";

const parseInputsMock = vi.fn();
const runMock = vi.fn();
vi.mock("../../src/inputs", () => ({ parseInputs: parseInputsMock }));
vi.mock("../../src/run", () => ({ run: runMock }));

describe("main entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
    parseInputsMock.mockReset();
    runMock.mockReset();
  });

  it("parses inputs and invokes run() without failing on success", async () => {
    parseInputsMock.mockReturnValue({ config: ".github/biotrace.yml" });
    runMock.mockResolvedValue({ status: "passed" });
    const setFailedSpy = vi.spyOn(core, "setFailed").mockImplementation(() => {});
    await import("../../src/main");
    await vi.waitFor(() => expect(runMock).toHaveBeenCalledTimes(1));
    expect(setFailedSpy).not.toHaveBeenCalled();
    setFailedSpy.mockRestore();
  });

  it("redacts secrets from thrown errors before calling setFailed", async () => {
    parseInputsMock.mockReturnValue({});
    runMock.mockRejectedValue(
      new Error("token ghp_123456789012345678901234567890123456 leaked"),
    );
    const setFailedSpy = vi.spyOn(core, "setFailed").mockImplementation(() => {});
    await import("../../src/main");
    await vi.waitFor(() => expect(setFailedSpy).toHaveBeenCalledTimes(1));
    const message = setFailedSpy.mock.calls[0]![0] as string;
    expect(message).toContain("[REDACTED]");
    expect(message).not.toContain("ghp_123456789012345678901234567890123456");
    setFailedSpy.mockRestore();
  });

  it("handles non-Error throws", async () => {
    parseInputsMock.mockReturnValue({});
    runMock.mockRejectedValue("plain string failure");
    const setFailedSpy = vi.spyOn(core, "setFailed").mockImplementation(() => {});
    await import("../../src/main");
    await vi.waitFor(() => expect(setFailedSpy).toHaveBeenCalledTimes(1));
    expect(setFailedSpy.mock.calls[0]![0]).toContain("plain string failure");
    setFailedSpy.mockRestore();
  });
});
