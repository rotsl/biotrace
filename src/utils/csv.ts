import * as fs from "node:fs";
import * as path from "node:path";
export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  delimiter: string;
  columnCount: number;
  errors: string[];
}
const MAX_CSV_SIZE = 200 * 1024 * 1024;
const MAX_CSV_ROWS = 1_000_000;
function detectDelimiter(content: string): string {
  const fl = content.split("\n").slice(0, 10).join("\n");
  const t = (fl.match(/\t/g) || []).length,
    c = (fl.match(/,/g) || []).length,
    s = (fl.match(/;/g) || []).length;
  if (t > c && t > s) return "\t";
  if (s > c) return ";";
  return ",";
}
export function parseCsv(
  filePath: string,
  workspace: string,
  delimiter: "auto" | "," | "\t" | ";" = "auto",
): CsvParseResult {
  const errors: string[] = [];
  const resolved = path.resolve(workspace, filePath);
  let content: string;
  try {
    const stat = fs.statSync(resolved, { throwIfNoEntry: false });
    if (!stat)
      return {
        headers: [],
        rows: [],
        rowCount: 0,
        delimiter: ",",
        columnCount: 0,
        errors: ["File not found"],
      };
    if (stat.size > MAX_CSV_SIZE)
      return {
        headers: [],
        rows: [],
        rowCount: 0,
        delimiter: ",",
        columnCount: 0,
        errors: ["File exceeds maximum size"],
      };
    content = fs.readFileSync(resolved, "utf-8");
  } catch (err) {
    return {
      headers: [],
      rows: [],
      rowCount: 0,
      delimiter: ",",
      columnCount: 0,
      errors: [`Read error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
  const dt = delimiter === "auto" ? detectDelimiter(content) : delimiter;
  const records: string[][] = [];
  let curRec: string[] = [];
  let inQ = false;
  let curF = "";
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    if (!inQ && line.trim() === "") continue;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (inQ) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            curF += '"';
            i++;
          } else {
            inQ = false;
          }
        } else {
          curF += ch;
        }
      } else {
        if (ch === '"') {
          inQ = true;
        } else if (ch === dt) {
          curRec.push(curF);
          curF = "";
        } else {
          curF += ch;
        }
      }
    }
    if (!inQ) {
      curRec.push(curF);
      curF = "";
      if (curRec.some((f) => f.trim() !== "")) records.push(curRec);
      curRec = [];
    } else {
      curF += "\n";
    }
  }
  if (inQ) {
    curRec.push(curF);
    if (curRec.some((f) => f.trim() !== "")) records.push(curRec);
  }
  if (records.length === 0)
    return { headers: [], rows: [], rowCount: 0, delimiter: dt, columnCount: 0, errors };
  const headers = records[0]!.map((h) => h.trim());
  const columnCount = headers.length;
  const rows: Record<string, string>[] = [];
  const maxR = Math.min(records.length - 1, MAX_CSV_ROWS);
  for (let ri = 1; ri <= maxR; ri++) {
    const rec = records[ri]!;
    if (rec.length !== columnCount)
      errors.push(`Row ${ri}: expected ${columnCount} cols, got ${rec.length}`);
    const row: Record<string, string> = {};
    for (let ci = 0; ci < columnCount; ci++)
      row[headers[ci]!] = ci < rec.length ? rec[ci]! : "";
    rows.push(row);
  }
  return { headers, rows, rowCount: rows.length, delimiter: dt, columnCount, errors };
}
export function findRows(
  rows: Record<string, string>[],
  match: Record<string, string>,
): { row: Record<string, string>; index: number }[] {
  return rows.reduce<{ row: Record<string, string>; index: number }[]>((acc, row, i) => {
    if (Object.entries(match).every(([k, v]) => row[k] === v))
      acc.push({ row, index: i });
    return acc;
  }, []);
}
