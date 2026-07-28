import { createFinding } from "../reporting/findings";
import type { Finding } from "../reporting/types";
import type { LineageConfig } from "../config/types";
import { safeFileExists } from "../utils/files";
export function validateLineage(
  lineage: LineageConfig,
  changedFiles: Set<string>,
  workspace: string,
): Finding[] {
  const findings: Finding[] = [];
  const {
    id,
    inputs,
    code,
    outputs,
    environment = [],
    claims = [],
    stale_output_severity = "warning",
    untraceable_output_severity = "warning",
  } = lineage;
  const ic = inputs.some((f) => changedFiles.has(f)),
    cc = code.some((f) => changedFiles.has(f)),
    oc = outputs.some((f) => changedFiles.has(f)),
    ec = environment.some((f) => changedFiles.has(f)),
    clc = claims.some((f) => changedFiles.has(f));
  if (ic && !oc)
    findings.push(
      createFinding(
        "lineage",
        stale_output_severity as Finding["severity"],
        "Possible stale output",
        `"${id}": input changed but output did not`,
        {
          label: "results:untraceable",
          evidence: { changed_inputs: inputs.filter((f) => changedFiles.has(f)) },
          remediation: "Re-run analysis.",
        },
      ),
    );
  if (cc && !oc)
    findings.push(
      createFinding(
        "lineage",
        stale_output_severity as Finding["severity"],
        "Possible stale output",
        `"${id}": code changed but output did not`,
        {
          label: "results:untraceable",
          evidence: { changed_code: code.filter((f) => changedFiles.has(f)) },
          remediation: "Re-run analysis.",
        },
      ),
    );
  if (oc && !cc && !ic)
    findings.push(
      createFinding(
        "lineage",
        untraceable_output_severity as Finding["severity"],
        "Output provenance unclear",
        `"${id}": output changed without code/input change`,
        {
          label: "results:untraceable",
          evidence: { changed_outputs: outputs.filter((f) => changedFiles.has(f)) },
          remediation: "Verify intentional change.",
        },
      ),
    );
  if (clc && !oc)
    findings.push(
      createFinding(
        "lineage",
        "warning",
        "Claim requires verification",
        `"${id}": claim changed but evidence unchanged`,
        { label: "claim:stale" },
      ),
    );
  if (ec && !oc)
    findings.push(
      createFinding(
        "lineage",
        "warning",
        "Reproduction recommended",
        `"${id}": environment changed but output unchanged`,
        { label: "reproducibility:partial" },
      ),
    );
  if (oc && !clc && claims.length > 0)
    findings.push(
      createFinding(
        "lineage",
        "warning",
        "Written claim may be stale",
        `"${id}": result changed but manuscript unchanged`,
        { label: "claim:stale" },
      ),
    );
  for (const f of [...inputs, ...code, ...outputs, ...environment, ...claims]) {
    if (!safeFileExists(f, workspace))
      findings.push(
        createFinding("lineage", "info", "Lineage file not found", `"${f}" in "${id}"`, {
          path: f,
        }),
      );
  }
  if (findings.filter((f) => f.severity !== "info").length === 0)
    findings.push(
      createFinding("lineage", "info", "Lineage traceable", `"${id}" all traceable`, {
        label: "results:verified",
      }),
    );
  return findings;
}
