import { describe, it, expect, beforeEach } from "vitest";
import { validateFastq } from "../../src/validators/fastq";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-fastq2-"));
});

describe("validateFastq edge cases", () => {
  it("reports no match when the glob finds nothing", async () => {
    const f = await validateFastq({ glob: "nope/*.fq" }, tmpDir);
    expect(f.some((x) => x.title === "No FASTQ files")).toBe(true);
  });

  it("reports an empty ID", async () => {
    fs.writeFileSync(path.join(tmpDir, "e.fq"), "@\nATCG\n+\n!!!!\n");
    const f = await validateFastq({ glob: "e.fq" }, tmpDir);
    expect(f.some((x) => x.title === "Empty ID")).toBe(true);
  });

  it("detects duplicate IDs when unique_ids is enabled", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "d.fq"),
      "@r1\nATCG\n+\n!!!!\n@r1\nGCTA\n+\n!!!!\n",
    );
    const f = await validateFastq({ glob: "d.fq", unique_ids: true }, tmpDir);
    expect(f.some((x) => x.title === "Duplicate ID")).toBe(true);
  });

  it("flags invalid RNA sequences", async () => {
    fs.writeFileSync(path.join(tmpDir, "r.fq"), "@r1\nATCG\n+\n!!!!\n");
    const f = await validateFastq({ glob: "r.fq", alphabet: "rna" }, tmpDir);
    expect(f.some((x) => x.title.includes("Invalid RNA"))).toBe(true);
  });

  it("does not flag empty sequences when reject_empty_sequences is false", async () => {
    fs.writeFileSync(path.join(tmpDir, "z.fq"), "@r1\n\n+\n\n");
    const f = await validateFastq(
      { glob: "z.fq", reject_empty_sequences: false },
      tmpDir,
    );
    expect(f.some((x) => x.title === "Empty sequence")).toBe(false);
  });

  it("detects an invalid separator line", async () => {
    fs.writeFileSync(path.join(tmpDir, "s.fq"), "@r1\nATCG\n-\n!!!!\n");
    const f = await validateFastq({ glob: "s.fq" }, tmpDir);
    expect(f.some((x) => x.title === "Invalid separator")).toBe(true);
  });

  it("stops after maximum_records and reports a record limit finding", async () => {
    const content = "@r1\nATCG\n+\n!!!!\n@r2\nATCG\n+\n!!!!\n@r3\nATCG\n+\n!!!!\n";
    fs.writeFileSync(path.join(tmpDir, "m.fq"), content);
    const f = await validateFastq({ glob: "m.fq", maximum_records: 1 }, tmpDir);
    expect(f.some((x) => x.title === "Record limit")).toBe(true);
  });
});
