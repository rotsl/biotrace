import { describe, it, expect, beforeEach } from "vitest";
import { parseCsv, findRows } from "../../src/utils/csv";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-csv-"));
});
describe("parseCsv", () => {
  it("parses simple CSV", () => {
    fs.writeFileSync(path.join(tmpDir, "s.csv"), "name,age\nAlice,30\nBob,25\n");
    const r = parseCsv("s.csv", tmpDir);
    expect(r.headers).toEqual(["name", "age"]);
    expect(r.rowCount).toBe(2);
  });
  it("parses TSV with auto-detect", () => {
    fs.writeFileSync(path.join(tmpDir, "s.tsv"), "name\tage\nAlice\t30\n");
    const r = parseCsv("s.tsv", tmpDir, "auto");
    expect(r.headers).toEqual(["name", "age"]);
    expect(r.delimiter).toBe("\t");
  });
  it("handles quoted fields with embedded commas", () => {
    fs.writeFileSync(path.join(tmpDir, "q.csv"), 'name,desc\nAlice,"has, comma"\n');
    const r = parseCsv("q.csv", tmpDir);
    expect(r.rows[0]?.desc).toBe("has, comma");
  });
  it("reports missing file", () => {
    const r = parseCsv("missing.csv", tmpDir);
    expect(r.errors).toContain("File not found");
  });
});
describe("findRows", () => {
  it("finds matching rows", () => {
    const rows = [
      { gene: "IL6", val: "1.7" },
      { gene: "TNF", val: "2.0" },
    ];
    const m = findRows(rows, { gene: "IL6" });
    expect(m.length).toBe(1);
    expect(m[0]!.row.val).toBe("1.7");
  });
  it("returns empty for no match", () => {
    expect(findRows([{ gene: "IL6" }], { gene: "XYZ" })).toEqual([]);
  });
});
