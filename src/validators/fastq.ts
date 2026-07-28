import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { createFinding } from "../reporting/findings";
import type { Finding } from "../reporting/types";
import type { FastqFileConfig } from "../config/types";
import { DNA_ALPHABET, RNA_ALPHABET } from "../utils/patterns";
const MAX_SIZE = 500 * 1024 * 1024;
export async function validateFastq(
  config: FastqFileConfig,
  workspace: string,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const maxRec = config.maximum_records ?? 1_000_000;
  const { create } = await import("@actions/glob");
  const anchored = path.isAbsolute(config.glob)
    ? config.glob
    : path.join(workspace, config.glob);
  const globber = await create(anchored);
  const files = await globber.glob();
  if (files.length === 0) {
    findings.push(
      createFinding("fastq", "info", "No FASTQ files", `No match: ${config.glob}`),
    );
    return findings;
  }
  for (const fp of files)
    findings.push(
      ...(await validateOneFastq(fp, path.relative(workspace, fp), config, maxRec)),
    );
  return findings;
}
async function validateOneFastq(
  fp: string,
  rel: string,
  cfg: FastqFileConfig,
  maxRec: number,
): Promise<Finding[]> {
  const findings: Finding[] = [];
  const {
    alphabet = "unrestricted",
    unique_ids = false,
    reject_empty_sequences = true,
  } = cfg;
  const stat = fs.statSync(fp, { throwIfNoEntry: false });
  if (!stat) {
    findings.push(createFinding("fastq", "error", "File not found", rel, { path: rel }));
    return findings;
  }
  if (stat.size > MAX_SIZE) {
    findings.push(createFinding("fastq", "error", "File too large", rel, { path: rel }));
    return findings;
  }
  const ids = new Set<string>();
  let cnt = 0,
    lc = 0,
    seq = "";
  let qual: string;
  let state: 0 | 1 | 2 | 3 = 0;
  const rl = readline.createInterface({
    input: fs.createReadStream(fp, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    lc++;
    switch (state) {
      case 0:
        if (!line.startsWith("@"))
          findings.push(
            createFinding(
              "fastq",
              "error",
              "Invalid header",
              `Expected @ at line ${lc}`,
              { path: rel, startLine: lc },
            ),
          );
        else {
          const id = line.substring(1).split(/\s/)[0] ?? "";
          if (!id)
            findings.push(
              createFinding("fastq", "error", "Empty ID", `Empty at line ${lc}`, {
                path: rel,
                startLine: lc,
              }),
            );
          else if (unique_ids) {
            if (ids.has(id))
              findings.push(
                createFinding(
                  "fastq",
                  "warning",
                  "Duplicate ID",
                  `"${id}" at line ${lc}`,
                  { path: rel, startLine: lc },
                ),
              );
            else ids.add(id);
          }
        }
        state = 1;
        break;
      case 1:
        seq = line;
        if (reject_empty_sequences && !line.trim())
          findings.push(
            createFinding("fastq", "error", "Empty sequence", `At line ${lc}`, {
              path: rel,
              startLine: lc,
            }),
          );
        else if (line.trim()) {
          if (alphabet === "dna" && !DNA_ALPHABET.test(line.trim()))
            findings.push(
              createFinding("fastq", "warning", "Invalid DNA", `At line ${lc}`, {
                path: rel,
              }),
            );
          if (alphabet === "rna" && !RNA_ALPHABET.test(line.trim()))
            findings.push(
              createFinding("fastq", "warning", "Invalid RNA", `At line ${lc}`, {
                path: rel,
              }),
            );
        }
        state = 2;
        break;
      case 2:
        if (!line.startsWith("+"))
          findings.push(
            createFinding(
              "fastq",
              "error",
              "Invalid separator",
              `Expected + at line ${lc}`,
              { path: rel, startLine: lc },
            ),
          );
        state = 3;
        break;
      case 3:
        qual = line;
        if (qual.length !== seq.length)
          findings.push(
            createFinding(
              "fastq",
              "error",
              "Quality-length mismatch",
              `Seq ${seq.length}!=Qual ${qual.length} at line ${lc}`,
              { path: rel, startLine: lc },
            ),
          );
        cnt++;
        state = 0;
        break;
    }
    if (cnt >= maxRec) {
      findings.push(
        createFinding("fastq", "info", "Record limit", `Stopped after ${maxRec}`, {
          path: rel,
        }),
      );
      break;
    }
  }
  if (state !== 0)
    findings.push(
      createFinding("fastq", "error", "Truncated record", "Incomplete at end", {
        path: rel,
      }),
    );
  if (findings.filter((f) => f.severity === "error").length === 0 && cnt > 0)
    findings.push(
      createFinding("fastq", "info", "FASTQ valid", `${rel}: ${cnt} records`, {
        path: rel,
        label: "data:valid",
      }),
    );
  return findings;
}
