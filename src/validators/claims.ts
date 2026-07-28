import { parseCsv, findRows } from "../utils/csv";
import { createFinding } from "../reporting/findings";
import type { Finding, ClaimResult } from "../reporting/types";
import type { ClaimConfig, AssertionConfig } from "../config/types";
import { safeReadFile } from "../utils/files";
export function validateClaim(
  claim: ClaimConfig,
  workspace: string,
): { findings: Finding[]; result: ClaimResult } {
  const findings: Finding[] = [];
  const assertionResults: ClaimResult["assertions"] = [];
  const src = safeReadFile(claim.source.path, workspace);
  if (src === null) {
    findings.push(
      createFinding("claim", "error", "Source not found", `"${claim.source.path}"`, {
        path: claim.source.path,
        label: "claim:unsupported",
      }),
    );
    return {
      findings,
      result: {
        id: claim.id,
        status: "error",
        assertions: [],
        message: `Source not found`,
      },
    };
  }
  if (claim.source.marker && !src.includes(claim.source.marker)) {
    findings.push(
      createFinding(
        "claim",
        "warning",
        "Marker not found",
        `"${claim.source.marker}" not in ${claim.source.path}`,
        { path: claim.source.path, label: "claim:unsupported" },
      ),
    );
    return {
      findings,
      result: {
        id: claim.id,
        status: "error",
        assertions: [],
        message: "Marker not found",
      },
    };
  }
  const ev = parseCsv(claim.evidence.path, workspace);
  if (ev.headers.length === 0) {
    findings.push(
      createFinding("claim", "error", "Evidence not found", `"${claim.evidence.path}"`, {
        path: claim.evidence.path,
        label: "claim:unsupported",
      }),
    );
    return {
      findings,
      result: {
        id: claim.id,
        status: "missing_evidence",
        assertions: claim.assertions.map((a) => ({
          field: a.field,
          operator: a.operator,
          expected: a.value,
          observed: null,
          passed: false,
        })),
      },
    };
  }
  const matched = findRows(ev.rows, claim.evidence.match ?? {});
  if (matched.length === 0) {
    findings.push(
      createFinding("claim", "error", "No matching rows", `No rows for "${claim.id}"`, {
        path: claim.evidence.path,
        label: "claim:unsupported",
      }),
    );
    return {
      findings,
      result: {
        id: claim.id,
        status: "missing_evidence",
        assertions: claim.assertions.map((a) => ({
          field: a.field,
          operator: a.operator,
          expected: a.value,
          observed: null,
          passed: false,
        })),
      },
    };
  }
  if (matched.length > 1)
    findings.push(
      createFinding(
        "claim",
        "warning",
        "Ambiguous match",
        `${matched.length} rows for "${claim.id}"`,
        { path: claim.evidence.path, label: "claim:manual-review" },
      ),
    );
  const row = matched[0]!.row;
  let allPassed = true;
  for (const a of claim.assertions) {
    const obs = row[a.field];
    const passed = evalAssert(a, obs);
    if (!passed) allPassed = false;
    assertionResults.push({
      field: a.field,
      operator: a.operator,
      expected: a.value,
      observed: obs ?? null,
      passed,
    });
  }
  if (allPassed)
    findings.push(
      createFinding("claim", "info", "Claim verified", `"${claim.id}" passed`, {
        path: claim.evidence.path,
        label: "claim:verified",
      }),
    );
  else
    findings.push(
      createFinding("claim", "error", "Claim assertion failed", `"${claim.id}" failed`, {
        path: claim.evidence.path,
        label: "claim:unsupported",
        evidence: { failed: assertionResults.filter((a) => !a.passed) },
      }),
    );
  return {
    findings,
    result: {
      id: claim.id,
      status: allPassed ? "verified" : "failed",
      assertions: assertionResults,
    },
  };
}
function evalAssert(a: AssertionConfig, obs: string | undefined): boolean {
  if (obs === undefined) return false;
  switch (a.operator) {
    case "==":
      return obs === String(a.value);
    case "!=":
      return obs !== String(a.value);
    case ">":
      return parseFloat(obs) > parseFloat(String(a.value));
    case ">=":
      return parseFloat(obs) >= parseFloat(String(a.value));
    case "<":
      return parseFloat(obs) < parseFloat(String(a.value));
    case "<=":
      return parseFloat(obs) <= parseFloat(String(a.value));
    case "in": {
      const arr = Array.isArray(a.value) ? a.value : [a.value];
      return arr.some((v) => obs === String(v));
    }
    case "not_in": {
      const arr = Array.isArray(a.value) ? a.value : [a.value];
      return !arr.some((v) => obs === String(v));
    }
    case "matches": {
      try {
        return new RegExp(String(a.value)).test(obs);
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}
