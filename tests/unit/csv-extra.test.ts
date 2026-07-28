import { describe, it, expect, beforeEach } from "vitest";
import { parseCsv } from "../../src/utils/csv";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-csv2-"));
});

describe("parseCsv edge cases", () => {
  it("auto-detects a semicolon delimiter", () => {
    fs.writeFileSync(path.join(tmpDir, "s.csv"), "name;age\nAlice;30\n");
    const r = parseCsv("s.csv", tmpDir, "auto");
    expect(r.delimiter).toBe(";");
    expect(r.headers).toEqual(["name", "age"]);
  });

  it("respects an explicit delimiter override", () => {
    fs.writeFileSync(path.join(tmpDir, "s.csv"), "name,age\nAlice,30\n");
    const r = parseCsv("s.csv", tmpDir, ",");
    expect(r.delimiter).toBe(",");
  });

  it("records an error for rows with the wrong column count", () => {
    fs.writeFileSync(path.join(tmpDir, "s.csv"), "a,b,c\n1,2\n");
    const r = parseCsv("s.csv", tmpDir);
    expect(r.errors.some((e) => e.includes("expected 3 cols, got 2"))).toBe(true);
    expect(r.rows[0]).toEqual({ a: "1", b: "2", c: "" });
  });

  it("handles an escaped double quote inside a quoted field", () => {
    fs.writeFileSync(path.join(tmpDir, "q.csv"), 'name,quote\nAlice,"she said ""hi"""\n');
    const r = parseCsv("q.csv", tmpDir);
    expect(r.rows[0]?.quote).toBe('she said "hi"');
  });

  it("handles a quoted field containing an embedded newline", () => {
    fs.writeFileSync(path.join(tmpDir, "n.csv"), 'name,note\nAlice,"line1\nline2"\n');
    const r = parseCsv("n.csv", tmpDir);
    expect(r.rows[0]?.note).toBe("line1\nline2");
  });

  it("returns empty results for a file with only blank lines", () => {
    fs.writeFileSync(path.join(tmpDir, "blank.csv"), "\n\n\n");
    const r = parseCsv("blank.csv", tmpDir);
    expect(r.headers).toEqual([]);
    expect(r.rowCount).toBe(0);
  });
});
