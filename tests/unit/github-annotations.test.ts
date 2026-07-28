import { describe, it, expect, vi, beforeEach } from "vitest";
import * as core from "@actions/core";
import { createAnnotations } from "../../src/github/annotations";
import type { Finding } from "../../src/reporting/types";

vi.mock("@actions/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@actions/core")>();
  return { ...actual, error: vi.fn(), warning: vi.fn() };
});

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
  beforeEach(() => {
    vi.mocked(core.error).mockClear();
    vi.mocked(core.warning).mockClear();
  });

  it("emits core.error for error findings with a path", () => {
    createAnnotations([finding({ severity: "error", path: "data.csv" })]);
    expect(core.error).toHaveBeenCalledTimes(1);
    expect(core.warning).not.toHaveBeenCalled();
  });

  it("emits core.warning for warning findings with a path", () => {
    createAnnotations([finding({ severity: "warning", path: "data.csv" })]);
    expect(core.warning).toHaveBeenCalledTimes(1);
    expect(core.error).not.toHaveBeenCalled();
  });

  it("skips info findings and findings without a path", () => {
    createAnnotations([
      finding({ severity: "info", path: "data.csv" }),
      finding({ severity: "error", path: undefined }),
    ]);
    expect(core.error).not.toHaveBeenCalled();
    expect(core.warning).not.toHaveBeenCalled();
  });

  it("caps annotations at 50", () => {
    const findings = Array.from({ length: 60 }, (_, i) =>
      finding({ severity: "error", path: `f${i}.csv` }),
    );
    createAnnotations(findings);
    expect(core.error).toHaveBeenCalledTimes(50);
  });
});
