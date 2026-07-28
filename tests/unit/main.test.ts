import { describe, it, expect, vi, beforeEach } from "vitest";

const parseInputsMock = vi.fn();
const runMock = vi.fn();
const setFailedMock = vi.fn();
vi.mock("../../src/inputs", () => ({ parseInputs: parseInputsMock }));
vi.mock("../../src/run", () => ({ run: runMock }));
vi.mock("@actions/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@actions/core")>();
  return { ...actual, setFailed: setFailedMock };
});

describe("main entrypoint", () => {
  beforeEach(() => {
    vi.resetModules();
    parseInputsMock.mockReset();
    runMock.mockReset();
    setFailedMock.mockReset();
  });

  it("parses inputs and invokes run() without failing on success", async () => {
    parseInputsMock.mockReturnValue({ config: ".github/biotrace.yml" });
    runMock.mockResolvedValue({ status: "passed" });
    await import("../../src/main");
    await vi.waitFor(() => expect(runMock).toHaveBeenCalledTimes(1));
    expect(setFailedMock).not.toHaveBeenCalled();
  });

  it("redacts secrets from thrown errors before calling setFailed", async () => {
    parseInputsMock.mockReturnValue({});
    runMock.mockRejectedValue(
      new Error("token ghp_123456789012345678901234567890123456 leaked"),
    );
    await import("../../src/main");
    await vi.waitFor(() => expect(setFailedMock).toHaveBeenCalledTimes(1));
    const message = setFailedMock.mock.calls[0]![0] as string;
    expect(message).toContain("[REDACTED]");
    expect(message).not.toContain("ghp_123456789012345678901234567890123456");
  });

  it("handles non-Error throws", async () => {
    parseInputsMock.mockReturnValue({});
    runMock.mockRejectedValue("plain string failure");
    await import("../../src/main");
    await vi.waitFor(() => expect(setFailedMock).toHaveBeenCalledTimes(1));
    expect(setFailedMock.mock.calls[0]![0]).toContain("plain string failure");
  });
});
