import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { createFinding } from "../reporting/findings";
import type { Finding } from "../reporting/types";
import type { FastaFileConfig } from "../config/types";
import { DNA_ALPHABET, RNA_ALPHABET, PROTEIN_ALPHABET } from "../utils/patterns";
import { globFiles } from "../utils/glob";
const MAX_SIZE = 500 * 1024 * 1024;
const MAX_REC = 10_000_000;
export async function validateFasta(
  config: FastaFileConfig,
  workspace: string,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const files = await globFiles(config.glob, workspace);
  if (files.length === 0) {
    findings.push(
      createFinding("fasta", "info", "No FASTA files", `No match: ${config.glob}`),
    );
    return findings;
  }
  for (const fp of files)
    findings.push(...(await validateOneFasta(fp, path.relative(workspace, fp), config)));
  return findings;
}
async function validateOneFasta(
  fp: string,
  rel: string,
  cfg: FastaFileConfig,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const {
    alphabet = "unrestricted",
    unique_ids = true,
    reject_empty_sequences = true,
    minimum_length,
    maximum_length,
  } = cfg;
  const stat = fs.statSync(fp, { throwIfNoEntry: false });
  if (!stat) {
    findings.push(createFinding("fasta", "error", "File not found", rel, { path: rel }));
    return findings;
  }
  if (stat.size > MAX_SIZE) {
    findings.push(createFinding("fasta", "error", "File too large", rel, { path: rel }));
    return findings;
  }
  const ids = new Map<string, number>();
  let cnt = 0,
    curId = "",
    curSeq = "",
    curLine = 0,
    recStart = 0,
    hasRec = false;
  const rl = readline.createInterface({
    input: fs.createReadStream(fp, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    curLine++;
    if (line.startsWith(">")) {
      if (hasRec) {
        cnt++;
        chkSeq(
          curId,
          curSeq,
          rel,
          recStart,
          alphabet,
          reject_empty_sequences,
          minimum_length,
          maximum_length,
          findings,
        );
        if (unique_ids && curId) {
          if (ids.has(curId))
            findings.push(
              createFinding("fasta", "error", "Duplicate ID", `"${curId}"`, {
                path: rel,
                startLine: recStart,
              }),
            );
          else ids.set(curId, recStart);
        }
      }
      const hdr = line.substring(1).trim();
      const si = hdr.indexOf(" ");
      curId = si >= 0 ? hdr.substring(0, si) : hdr;
      if (!curId)
        findings.push(
          createFinding("fasta", "error", "Empty ID", `Empty at line ${curLine}`, {
            path: rel,
            startLine: curLine,
          }),
        );
      curSeq = "";
      recStart = curLine;
      hasRec = true;
    } else {
      curSeq += line.trim();
    }
    if (cnt >= MAX_REC) {
      findings.push(
        createFinding("fasta", "info", "Record limit", `Stopped after ${MAX_REC}`, {
          path: rel,
        }),
      );
      break;
    }
  }
  if (hasRec) {
    cnt++;
    chkSeq(
      curId,
      curSeq,
      rel,
      recStart,
      alphabet,
      reject_empty_sequences,
      minimum_length,
      maximum_length,
      findings,
    );
    if (unique_ids && curId && ids.has(curId))
      findings.push(
        createFinding("fasta", "error", "Duplicate ID", `"${curId}"`, { path: rel }),
      );
  }
  if (!hasRec)
    findings.push(
      createFinding("fasta", "error", "No records", `No FASTA in ${rel}`, { path: rel }),
    );
  if (findings.filter((f) => f.severity === "error").length === 0 && cnt > 0)
    findings.push(
      createFinding("fasta", "info", "FASTA valid", `${rel}: ${cnt} records`, {
        path: rel,
        label: "data:valid",
      }),
    );
  return findings;
}
function chkSeq(
  id: string,
  seq: string,
  p: string,
  ln: number,
  alph: string,
  noEmpty: boolean,
  minLen?: number,
  maxLen?: number,
  findings: Finding[] = [],
): void {
  if (noEmpty && !seq.trim())
    findings.push(
      createFinding("fasta", "error", "Empty sequence", `"${id}" empty`, {
        path: p,
        startLine: ln,
      }),
    );
  if (seq.trim()) {
    if (alph === "dna" && !DNA_ALPHABET.test(seq))
      findings.push(
        createFinding("fasta", "warning", "Invalid DNA", `"${id}" non-DNA`, {
          path: p,
          startLine: ln,
        }),
      );
    if (alph === "rna" && !RNA_ALPHABET.test(seq))
      findings.push(
        createFinding("fasta", "warning", "Invalid RNA", `"${id}" non-RNA`, {
          path: p,
          startLine: ln,
        }),
      );
    if (alph === "protein" && !PROTEIN_ALPHABET.test(seq))
      findings.push(
        createFinding("fasta", "warning", "Invalid protein", `"${id}" non-protein`, {
          path: p,
          startLine: ln,
        }),
      );
  }
  if (minLen && seq.length < minLen)
    findings.push(
      createFinding(
        "fasta",
        "warning",
        "Below min length",
        `"${id}" ${seq.length}<${minLen}`,
        { path: p, startLine: ln },
      ),
    );
  if (maxLen && seq.length > maxLen)
    findings.push(
      createFinding(
        "fasta",
        "warning",
        "Above max length",
        `"${id}" ${seq.length}>${maxLen}`,
        { path: p, startLine: ln },
      ),
    );
}
