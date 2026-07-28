import { describe, it, expect, beforeEach } from "vitest";
import { validateFastq } from "../../src/validators/fastq";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-fastq-"));
});
describe("validateFastq", () => {
  it("validates valid FASTQ", async () => {
    fs.writeFileSync(path.join(tmpDir, "r.fq"), "@read1\nATCG\n+\n!!!!\n");
    const f = await validateFastq({ glob: "r.fq" }, tmpDir);
    expect(f.some((x) => x.severity === "error")).toBe(false);
  });
  it("detects quality-length mismatch", async () => {
    fs.writeFileSync(path.join(tmpDir, "m.fq"), "@read1\nATCG\n+\n!!\n");
    const f = await validateFastq({ glob: "m.fq" }, tmpDir);
    expect(f.some((x) => x.title === "Quality-length mismatch")).toBe(true);
  });
  it("detects truncated record", async () => {
    fs.writeFileSync(path.join(tmpDir, "t.fq"), "@read1\nATCG\n");
    const f = await validateFastq({ glob: "t.fq" }, tmpDir);
    expect(f.some((x) => x.title === "Truncated record")).toBe(true);
  });
  it("detects invalid header", async () => {
    fs.writeFileSync(path.join(tmpDir, "h.fq"), "noheader\nATCG\n+\n!!!!\n");
    const f = await validateFastq({ glob: "h.fq" }, tmpDir);
    expect(f.some((x) => x.title === "Invalid header")).toBe(true);
  });
});
