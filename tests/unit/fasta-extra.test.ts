import { describe, it, expect, beforeEach } from "vitest";
import { validateFasta } from "../../src/validators/fasta";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

let tmpDir: string;
beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-fasta2-"));
});

describe("validateFasta edge cases", () => {
  it("reports no match when the glob finds nothing", async () => {
    const f = await validateFasta({ glob: "nope/*.fa" }, tmpDir);
    expect(f.some((x) => x.title === "No FASTA files")).toBe(true);
  });

  it("reports no records for an empty file", async () => {
    fs.writeFileSync(path.join(tmpDir, "empty.fa"), "");
    const f = await validateFasta({ glob: "empty.fa" }, tmpDir);
    expect(f.some((x) => x.title === "No records")).toBe(true);
  });

  it("flags invalid RNA sequences", async () => {
    fs.writeFileSync(path.join(tmpDir, "r.fa"), ">seq1\nATCG\n");
    const f = await validateFasta({ glob: "r.fa", alphabet: "rna" }, tmpDir);
    expect(f.some((x) => x.title.includes("Invalid RNA"))).toBe(true);
  });

  it("flags invalid protein sequences", async () => {
    fs.writeFileSync(path.join(tmpDir, "p.fa"), ">seq1\n123\n");
    const f = await validateFasta({ glob: "p.fa", alphabet: "protein" }, tmpDir);
    expect(f.some((x) => x.title.includes("Invalid protein"))).toBe(true);
  });

  it("flags sequences below the minimum length", async () => {
    fs.writeFileSync(path.join(tmpDir, "s.fa"), ">seq1\nAT\n");
    const f = await validateFasta({ glob: "s.fa", minimum_length: 10 }, tmpDir);
    expect(f.some((x) => x.title === "Below min length")).toBe(true);
  });

  it("flags sequences above the maximum length", async () => {
    fs.writeFileSync(path.join(tmpDir, "s2.fa"), ">seq1\nATCGATCGAT\n");
    const f = await validateFasta({ glob: "s2.fa", maximum_length: 5 }, tmpDir);
    expect(f.some((x) => x.title === "Above max length")).toBe(true);
  });

  it("accepts unrestricted alphabet sequences with unusual characters", async () => {
    fs.writeFileSync(path.join(tmpDir, "u.fa"), ">seq1\nXYZ123\n");
    const f = await validateFasta({ glob: "u.fa", alphabet: "unrestricted" }, tmpDir);
    expect(f.some((x) => x.severity === "warning")).toBe(false);
  });

  it("does not flag duplicate IDs when unique_ids is false", async () => {
    fs.writeFileSync(path.join(tmpDir, "dup2.fa"), ">seq1\nATCG\n>seq1\nGCTA\n");
    const f = await validateFasta({ glob: "dup2.fa", unique_ids: false }, tmpDir);
    expect(f.some((x) => x.title === "Duplicate ID")).toBe(false);
  });
});
