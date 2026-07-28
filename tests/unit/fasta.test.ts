import { describe, it, expect, beforeEach } from "vitest";
import { validateFasta } from "../../src/validators/fasta";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-fasta-"));
});
describe("validateFasta", () => {
  it("validates valid FASTA", async () => {
    fs.writeFileSync(path.join(tmpDir, "seqs.fa"), ">seq1\nATCG\n>seq2\nGCTA\n");
    const f = await validateFasta(
      { glob: "seqs.fa", alphabet: "dna", unique_ids: true },
      tmpDir,
    );
    expect(f.some((x) => x.severity === "error")).toBe(false);
  });
  it("detects duplicate IDs", async () => {
    fs.writeFileSync(path.join(tmpDir, "dup.fa"), ">seq1\nATCG\n>seq1\nGCTA\n");
    const f = await validateFasta({ glob: "dup.fa", unique_ids: true }, tmpDir);
    expect(f.some((x) => x.title === "Duplicate ID")).toBe(true);
  });
  it("detects empty sequences", async () => {
    fs.writeFileSync(path.join(tmpDir, "empty.fa"), ">seq1\n\n");
    const f = await validateFasta(
      { glob: "empty.fa", reject_empty_sequences: true },
      tmpDir,
    );
    expect(f.some((x) => x.title === "Empty sequence")).toBe(true);
  });
  it("detects invalid DNA characters", async () => {
    fs.writeFileSync(path.join(tmpDir, "bad.fa"), ">seq1\nATCG123\n");
    const f = await validateFasta({ glob: "bad.fa", alphabet: "dna" }, tmpDir);
    expect(f.some((x) => x.title.includes("Invalid DNA"))).toBe(true);
  });
  it("detects empty identifiers", async () => {
    fs.writeFileSync(path.join(tmpDir, "noid.fa"), ">\nATCG\n");
    const f = await validateFasta({ glob: "noid.fa" }, tmpDir);
    expect(f.some((x) => x.title === "Empty ID")).toBe(true);
  });
});
