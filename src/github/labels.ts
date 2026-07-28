import * as core from "@actions/core";
import type { GitHub } from "@actions/github/lib/utils";
import { DEFAULT_LABEL_COLOURS } from "../config/defaults";
export interface LabelDefinition {
  name: string;
  color: string;
  description: string;
}
const COLOUR_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(DEFAULT_LABEL_COLOURS).map(([category, hex]) => [hex, category]),
);
export const REQUIRED_LABELS: LabelDefinition[] = [
  { name: "biotrace:checking", color: "0969da", description: "BioTrace checking" },
  { name: "biotrace:passed", color: "1f883d", description: "BioTrace passed" },
  { name: "biotrace:warning", color: "bf8700", description: "BioTrace warnings" },
  { name: "biotrace:blocked", color: "d1242f", description: "BioTrace blocked" },
  {
    name: "biotrace:manual-review",
    color: "8250df",
    description: "BioTrace manual review",
  },
  { name: "data:changed", color: "0969da", description: "Data changed" },
  { name: "data:valid", color: "1f883d", description: "Data valid" },
  { name: "data:invalid", color: "d1242f", description: "Data invalid" },
  { name: "data:unexpected-loss", color: "d1242f", description: "Unexpected data loss" },
  { name: "metadata:valid", color: "1f883d", description: "Metadata valid" },
  { name: "metadata:warning", color: "bf8700", description: "Metadata warning" },
  { name: "metadata:mismatch", color: "bf8700", description: "Metadata mismatch" },
  { name: "metadata:missing", color: "d1242f", description: "Metadata missing" },
  {
    name: "metadata:duplicate-samples",
    color: "d1242f",
    description: "Duplicate samples",
  },
  {
    name: "reproducibility:strong",
    color: "1f883d",
    description: "Strong reproducibility",
  },
  {
    name: "reproducibility:partial",
    color: "bf8700",
    description: "Partial reproducibility",
  },
  { name: "reproducibility:weak", color: "d1242f", description: "Weak reproducibility" },
  {
    name: "reproducibility:regression",
    color: "d1242f",
    description: "Reproducibility regression",
  },
  { name: "claim:verified", color: "1f883d", description: "Claim verified" },
  { name: "claim:stale", color: "bf8700", description: "Claim stale" },
  { name: "claim:unsupported", color: "d1242f", description: "Claim unsupported" },
  { name: "claim:manual-review", color: "8250df", description: "Claim manual review" },
  { name: "results:verified", color: "1f883d", description: "Results verified" },
  { name: "results:changed", color: "0969da", description: "Results changed" },
  { name: "results:untraceable", color: "bf8700", description: "Results untraceable" },
  { name: "figure:verified", color: "1f883d", description: "Figure verified" },
  { name: "figure:stale", color: "bf8700", description: "Figure stale" },
  { name: "figure:missing", color: "d1242f", description: "Figure missing" },
  {
    name: "figure:provenance-missing",
    color: "bf8700",
    description: "Figure provenance missing",
  },
  { name: "ai:reviewed", color: "8250df", description: "AI reviewed" },
  { name: "ai:suggestion", color: "8250df", description: "AI suggestion" },
  { name: "ai:unavailable", color: "bf8700", description: "AI unavailable" },
  {
    name: "ai:manual-verification",
    color: "8250df",
    description: "AI manual verification",
  },
];
export const EXCLUSIVE_GROUPS = [
  [
    "biotrace:checking",
    "biotrace:passed",
    "biotrace:warning",
    "biotrace:blocked",
    "biotrace:manual-review",
  ],
  [
    "reproducibility:strong",
    "reproducibility:partial",
    "reproducibility:weak",
    "reproducibility:regression",
  ],
];
function pf(n: string, prefix: string): string {
  return prefix ? `${prefix}${n}` : n;
}
export async function ensureLabelsExist(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  prefix: string,
  colours: Record<string, string>,
  create: boolean,
): Promise<{ success: boolean; warning?: string }> {
  if (!create) return { success: true, warning: "Label creation disabled" };
  let anyFail = false;
  for (const l of REQUIRED_LABELS) {
    const n = pf(l.name, prefix);
    const category = COLOUR_TO_CATEGORY[l.color];
    const c = category && colours[category] ? colours[category]! : l.color;
    try {
      await octokit.rest.issues.createLabel({
        owner,
        repo,
        name: n,
        color: c,
        description: l.description,
      });
    } catch (err: unknown) {
      const status =
        err instanceof Error && "status" in err
          ? (err as Error & { status?: number }).status
          : undefined;
      if (status === 422) {
        try {
          await octokit.rest.issues.updateLabel({
            owner,
            repo,
            name: n,
            color: c,
            description: l.description,
          });
        } catch {
          /* label update failed; leave existing label as-is */
        }
      } else {
        anyFail = true;
        core.warning(`Failed label "${n}"`);
      }
    }
  }
  return anyFail ? { success: false, warning: "Some labels failed" } : { success: true };
}
export async function applyLabels(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  prNum: number,
  labels: string[],
  prefix: string,
): Promise<void> {
  try {
    await octokit.rest.issues.addLabels({
      owner,
      repo,
      issue_number: prNum,
      labels: labels.map((l) => pf(l, prefix)),
    });
  } catch (err) {
    core.warning(
      `Failed to add labels: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
export async function removeLabels(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  prNum: number,
  labels: string[],
  prefix: string,
): Promise<void> {
  for (const l of labels) {
    try {
      await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: prNum,
        name: pf(l, prefix),
      });
    } catch {
      /* label may not be present */
    }
  }
}
export async function manageExclusiveLabels(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  prNum: number,
  active: string,
  group: string[],
  prefix: string,
): Promise<void> {
  for (const l of group.filter((g) => g !== active)) {
    try {
      await octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number: prNum,
        name: pf(l, prefix),
      });
    } catch {
      /* label may not be present */
    }
  }
}
