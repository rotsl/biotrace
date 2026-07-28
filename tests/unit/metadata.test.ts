import { describe, it, expect, beforeEach } from "vitest";
import { validateMetadataTable } from "../../src/validators/metadata-table";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-meta-"));
});
describe("validateMetadataTable", () => {
  it("passes valid metadata", () => {
    fs.writeFileSync(
      path.join(tmpDir, "m.csv"),
      "sample_id,condition,replicate\nS1,control,1\nS2,treatment,1\n",
    );
    const f = validateMetadataTable(
      { path: "m.csv", required_columns: ["sample_id", "condition"] },
      tmpDir,
    );
    expect(f.some((x) => x.severity === "error")).toBe(false);
  });
  it("detects missing required column", () => {
    fs.writeFileSync(path.join(tmpDir, "m.csv"), "sample_id,condition\nS1,control\n");
    const f = validateMetadataTable(
      { path: "m.csv", required_columns: ["sample_id", "biological_replicate"] },
      tmpDir,
    );
    expect(f.some((x) => x.title === "Missing required column")).toBe(true);
  });
  it("detects null values in non-null columns", () => {
    fs.writeFileSync(path.join(tmpDir, "m.csv"), "sample_id,condition\nS1,\n");
    const f = validateMetadataTable({ path: "m.csv", non_null: ["condition"] }, tmpDir);
    expect(f.some((x) => x.title === "Null value in non-null column")).toBe(true);
  });
  it("detects duplicate values in unique column", () => {
    fs.writeFileSync(
      path.join(tmpDir, "m.csv"),
      "sample_id,condition\nS1,control\nS1,treatment\n",
    );
    const f = validateMetadataTable({ path: "m.csv", unique: ["sample_id"] }, tmpDir);
    expect(f.some((x) => x.title === "Duplicate value in unique column")).toBe(true);
  });
  it("detects unexpected values", () => {
    fs.writeFileSync(path.join(tmpDir, "m.csv"), "sample_id,condition\nS1,unknown\n");
    const f = validateMetadataTable(
      { path: "m.csv", allowed_values: { condition: ["control", "treatment"] } },
      tmpDir,
    );
    expect(f.some((x) => x.title === "Unexpected value")).toBe(true);
  });
  it("detects group below minimum size", () => {
    fs.writeFileSync(
      path.join(tmpDir, "m.csv"),
      "sample_id,condition\nS1,control\nS2,treatment\nS3,treatment\n",
    );
    const f = validateMetadataTable(
      {
        path: "m.csv",
        minimum_group_size: { group_by: "condition", value: 3, severity: "warning" },
      },
      tmpDir,
    );
    expect(f.some((x) => x.title === "Group below minimum")).toBe(true);
  });
});
