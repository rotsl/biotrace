import { describe, it, expect, vi } from "vitest";
import * as core from "@actions/core";
import { createAnnotations } from "../../src/github/annotations";
import type { Finding } from "../../src/reporting/types";

function finding(overrides: Partial<Finding>): Finding {
  return {
    id: "x-0001",
    module: "metadata",
    severity: "warning",
    title: "t",
    message: "m",
    deterministic: true,
    ...overrides,
  };
}

describe("createAnnotations", () => {
  it("emits core.error for error findings with a path", () => {
    const errorSpy = vi.spyOn(core, "error").mockImplementation(() => {});
    const warningSpy = vi.spyOn(core, "warning").mockImplementation(() => {});
    createAnnotations([finding({ severity: "error", path: "data.csv" })]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(warningSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warningSpy.mockRestore();
  });

  it("emits core.warning for warning findings with a path", () => {
    const errorSpy = vi.spyOn(core, "error").mockImplementation(() => {});
    const warningSpy = vi.spyOn(core, "warning").mockImplementation(() => {});
    createAnnotations([finding({ severity: "warning", path: "data.csv" })]);
    expect(warningSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warningSpy.mockRestore();
  });

  it("skips info findings and findings without a path", () => {
    const errorSpy = vi.spyOn(core, "error").mockImplementation(() => {});
    const warningSpy = vi.spyOn(core, "warning").mockImplementation(() => {});
    createAnnotations([
      finding({ severity: "info", path: "data.csv" }),
      finding({ severity: "error", path: undefined }),
    ]);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warningSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warningSpy.mockRestore();
  });

  it("caps annotations at 50", () => {
    const errorSpy = vi.spyOn(core, "error").mockImplementation(() => {});
    const findings = Array.from({ length: 60 }, (_, i) =>
      finding({ severity: "error", path: `f${i}.csv` }),
    );
    createAnnotations(findings);
    expect(errorSpy).toHaveBeenCalledTimes(50);
    errorSpy.mockRestore();
  });
});
