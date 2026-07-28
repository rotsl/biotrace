import { describe, it, expect } from "vitest";
import { validateLineage } from "../../src/validators/lineage";

describe("validateLineage additional branches", () => {
  it("flags a stale claim when the claim changed but the output didn't", () => {
    const f = validateLineage(
      { id: "t", inputs: [], code: [], outputs: [], claims: ["manuscript.md"] },
      new Set(["manuscript.md"]),
      "/tmp",
    );
    expect(f.some((x) => x.title === "Claim requires verification")).toBe(true);
  });

  it("recommends reproduction when the environment changed but the output didn't", () => {
    const f = validateLineage(
      { id: "t", inputs: [], code: [], outputs: [], environment: ["renv.lock"] },
      new Set(["renv.lock"]),
      "/tmp",
    );
    expect(f.some((x) => x.title === "Reproduction recommended")).toBe(true);
  });

  it("flags a possibly-stale written claim when the output changed but the manuscript didn't", () => {
    const f = validateLineage(
      { id: "t", inputs: [], code: [], outputs: ["out.csv"], claims: ["manuscript.md"] },
      new Set(["out.csv"]),
      "/tmp",
    );
    expect(f.some((x) => x.title === "Written claim may be stale")).toBe(true);
  });

  it("reports a lineage file that does not exist on disk", () => {
    const f = validateLineage(
      { id: "t", inputs: ["missing-input.csv"], code: [], outputs: [] },
      new Set(),
      "/tmp/does-not-exist-workspace",
    );
    expect(f.some((x) => x.title === "Lineage file not found")).toBe(true);
  });

  it("respects a custom severity for stale outputs", () => {
    const f = validateLineage(
      {
        id: "t",
        inputs: ["in.csv"],
        code: [],
        outputs: [],
        stale_output_severity: "error",
      },
      new Set(["in.csv"]),
      "/tmp",
    );
    const stale = f.find((x) => x.title === "Possible stale output");
    expect(stale?.severity).toBe("error");
  });

  it("respects a custom severity for untraceable outputs", () => {
    const f = validateLineage(
      {
        id: "t",
        inputs: [],
        code: [],
        outputs: ["out.csv"],
        untraceable_output_severity: "error",
      },
      new Set(["out.csv"]),
      "/tmp",
    );
    const untraceable = f.find((x) => x.title === "Output provenance unclear");
    expect(untraceable?.severity).toBe("error");
  });
});
