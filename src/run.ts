import * as core from "@actions/core";
import type { ActionInputs } from "./inputs";
import type { BioTraceConfig } from "./config/types";
import type { BioTraceReport, Finding, ClaimResult } from "./reporting/types";
import {
  resetFindingCounter,
  deduplicateFindings,
  isBlocking,
} from "./reporting/findings";
import { validateMetadataTable } from "./validators/metadata-table";
import { validateFasta } from "./validators/fasta";
import { validateFastq } from "./validators/fastq";
import { validateLineage } from "./validators/lineage";
import { validateClaim } from "./validators/claims";
import { validateFigure } from "./validators/figures";
import { calculateReproducibilityScore } from "./reproducibility/scoring";
import { createGitHubClient, getRepoContext, getPrNumber } from "./github/client";
import { getChangedFiles } from "./github/changed-files";
import {
  ensureLabelsExist,
  applyLabels,
  removeLabels,
  manageExclusiveLabels,
  REQUIRED_LABELS,
  EXCLUSIVE_GROUPS,
} from "./github/labels";
import { upsertComment } from "./github/comments";
import { createAnnotations } from "./github/annotations";
import { generatePRComment, generateStepSummary } from "./reporting/markdown";
import { writeReport } from "./reporting/json";
import { determineStatus } from "./reporting/summary";
import { OpenAICompatibleProvider } from "./ai/openai-compatible";
import { sanitiseForAI } from "./ai/sanitise";
import { loadConfig, ConfigurationError } from "./config/load";
import { logWarning } from "./utils/logging";

export async function run(inputs: ActionInputs): Promise<BioTraceReport> {
  resetFindingCounter();
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const allFindings: Finding[] = [];
  const claimResults: ClaimResult[] = [];
  const lineageResults: Array<{ id: string; status: string; details: string[] }> = [];
  let filesChecked = 0;

  let config: BioTraceConfig;
  try {
    config = loadConfig(inputs.config, workspace);
  } catch (err) {
    if (err instanceof ConfigurationError) {
      core.setFailed(err.message);
      throw err;
    }
    core.setFailed(`Config error: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }

  const octokit = inputs.githubToken ? createGitHubClient(inputs.githubToken) : null;
  const { owner, repo } = getRepoContext();
  const prNumber = getPrNumber();
  let changedFilesList: string[] = [];
  if (octokit && prNumber)
    changedFilesList = await getChangedFiles(octokit, owner, repo, prNumber);
  const changedSet = new Set(changedFilesList);

  if (config.files?.metadata)
    for (const mc of config.files.metadata) {
      allFindings.push(...validateMetadataTable(mc, workspace));
      filesChecked++;
    }
  if (config.files?.fasta)
    for (const fc of config.files.fasta) {
      allFindings.push(...(await validateFasta(fc, workspace)));
      filesChecked++;
    }
  if (config.files?.fastq)
    for (const fqc of config.files.fastq) {
      allFindings.push(...(await validateFastq(fqc, workspace)));
      filesChecked++;
    }
  if (config.lineage)
    for (const lc of config.lineage) {
      const fs = validateLineage(lc, changedSet, workspace);
      allFindings.push(...fs);
      lineageResults.push({
        id: lc.id,
        status:
          fs.filter((f) => f.severity !== "info").length > 0 ? "issues" : "traceable",
        details: fs.map((f) => f.title),
      });
    }
  if (config.claims)
    for (const cc of config.claims) {
      const { findings, result } = validateClaim(cc, workspace);
      allFindings.push(...findings);
      claimResults.push(result);
    }
  const figProvenance: { path: string; hasProvenance: boolean }[] = [];
  if (config.figures)
    for (const fc of config.figures) {
      const { findings, hasProvenance } = validateFigure(fc, changedSet, workspace);
      allFindings.push(...findings);
      figProvenance.push({ path: fc.path, hasProvenance });
    }
  const repResult = calculateReproducibilityScore(config, workspace, figProvenance);

  let aiEnabled = false;
  let aiStatus: string;
  let aiObservations:
    | Array<{
        title: string;
        message: string;
        confidence: number;
        paths: string[];
        requires_human_verification: boolean;
      }>
    | undefined;
  const effectiveAiEnabled =
    inputs.aiEnabled === "auto"
      ? process.env[inputs.aiKeyEnv]
        ? "true"
        : "false"
      : inputs.aiEnabled;
  if (effectiveAiEnabled === "true" && inputs.aiModel && octokit && prNumber) {
    const apiKey = process.env[inputs.aiKeyEnv] ?? "";
    if (apiKey) {
      try {
        const aiConfig = config.ai ?? {};
        const provider = new OpenAICompatibleProvider({
          apiKey,
          baseUrl: inputs.aiBaseUrl || aiConfig.base_url || "https://api.openai.com/v1",
          model: inputs.aiModel,
          timeout: 30000,
          maxRetries: 2,
          maxRequestSize: 500000,
        });
        const patch = changedFilesList
          .map((f) => `diff --git a/${f} b/${f}\n`)
          .join("\n");
        const sanitised = sanitiseForAI(
          changedFilesList,
          patch,
          aiConfig.never_send ?? [],
          aiConfig.maximum_changed_files ?? 100,
          aiConfig.maximum_patch_bytes ?? 150000,
        );
        const response = await provider.analyse({
          changedFiles: sanitised.changedFiles,
          patchContent: sanitised.patchContent,
          configSummary: JSON.stringify({ version: config.version }),
          findings: allFindings.map((f) => ({
            title: f.title,
            message: f.message,
            severity: f.severity,
          })),
          tasks: aiConfig.tasks ?? ["pr_summary"],
        });
        aiEnabled = true;
        aiStatus = "completed";
        aiObservations = response.observations.filter(
          (o) => o.confidence >= (aiConfig.minimum_confidence ?? 0.8),
        );
      } catch (err) {
        aiStatus = "failed";
        const failOpen = config.ai?.fail_open ?? true;
        if (!failOpen)
          allFindings.push({
            id: "ai-0001",
            module: "ai",
            severity: "warning",
            title: "AI provider failed",
            message: "AI analysis could not be completed",
            deterministic: false,
          });
        else
          logWarning(
            `AI failed (fail_open=true): ${err instanceof Error ? err.message : String(err)}`,
          );
      }
    } else {
      aiStatus = "no-key";
    }
  } else {
    aiStatus = effectiveAiEnabled === "false" ? "disabled" : "not-configured";
  }

  const finalFindings = deduplicateFindings(allFindings);
  const status = determineStatus(finalFindings, inputs.failOn);
  const blockingCount = finalFindings.filter((f) =>
    isBlocking(f.severity, inputs.failOn),
  ).length;

  const report: BioTraceReport = {
    schema_version: "1.0",
    generated_at: new Date().toISOString(),
    status,
    repository: { owner, name: repo },
    pull_request: prNumber
      ? {
          number: prNumber,
          base_sha: process.env.GITHUB_BASE_REF ?? "",
          head_sha: process.env.GITHUB_SHA ?? "",
        }
      : undefined,
    score: { reproducibility: repResult.score, components: repResult.components },
    summary: {
      files_checked: filesChecked,
      claims_checked: claimResults.length,
      figures_checked: figProvenance.length,
      findings: finalFindings.length,
      blocking_findings: blockingCount,
    },
    findings: finalFindings,
    claims: claimResults,
    lineage: lineageResults,
    ai: {
      enabled: aiEnabled,
      status: aiStatus,
      advisory_only: true,
      observations: aiObservations,
    },
  };
  writeReport(report, inputs.reportPath, workspace);
  core.setOutput("status", status);
  core.setOutput("score", String(report.score.reproducibility));
  core.setOutput("report-path", inputs.reportPath);
  core.setOutput("findings-count", String(finalFindings.length));
  core.setOutput("blocking-findings-count", String(blockingCount));
  core.summary.addRaw(generateStepSummary(report));
  await core.summary.write();
  createAnnotations(finalFindings);

  if (octokit && prNumber) {
    // Attempt labels/comments directly rather than pre-checking via
    // repos.get().permissions.push: that field reflects the caller's
    // collaborator role, not the workflow's granted GITHUB_TOKEN scopes, so
    // it reports no access even when the token can write fine. Each call
    // below already degrades gracefully (core.warning, no throw) when
    // access is genuinely unavailable, e.g. on a fork PR.
    const prefix = config.labels?.prefix ?? "";
    const colours = config.labels?.colours ?? {};
    if (inputs.createLabels) {
      await ensureLabelsExist(
        octokit,
        owner,
        repo,
        prefix,
        colours as Record<string, string>,
        config.labels?.create ?? true,
      );
      const overallLabel =
        status === "passed"
          ? "biotrace:passed"
          : status === "error"
            ? "biotrace:blocked"
            : "biotrace:warning";
      await manageExclusiveLabels(
        octokit,
        owner,
        repo,
        prNumber,
        overallLabel,
        EXCLUSIVE_GROUPS[0]!,
        prefix,
      );
      await applyLabels(octokit, owner, repo, prNumber, [overallLabel], prefix);
      const repLabel =
        repResult.score >= 80
          ? "reproducibility:strong"
          : repResult.score >= 50
            ? "reproducibility:partial"
            : "reproducibility:weak";
      await manageExclusiveLabels(
        octokit,
        owner,
        repo,
        prNumber,
        repLabel,
        EXCLUSIVE_GROUPS[1]!,
        prefix,
      );
      await applyLabels(octokit, owner, repo, prNumber, [repLabel], prefix);
      const findingLabels = [
        ...new Set(finalFindings.filter((f) => f.label).map((f) => f.label!)),
      ];
      const exclusiveGroupLabels = new Set(EXCLUSIVE_GROUPS.flat());
      const staleLabels = REQUIRED_LABELS.map((l) => l.name).filter(
        (name) => !exclusiveGroupLabels.has(name) && !findingLabels.includes(name),
      );
      await removeLabels(octokit, owner, repo, prNumber, staleLabels, prefix);
      if (findingLabels.length > 0)
        await applyLabels(octokit, owner, repo, prNumber, findingLabels, prefix);
    }
    const commentMode = config.comment?.mode ?? inputs.commentMode;
    const includePassed = config.comment?.include_passed_checks ?? false;
    const maxFindings = config.comment?.maximum_findings ?? 30;
    const commentBody = generatePRComment(report, includePassed, maxFindings);
    await upsertComment(octokit, owner, repo, prNumber, commentBody, commentMode);
  }

  if (status === "error")
    core.setFailed(
      `BioTrace: ${blockingCount} blocking finding(s). Score: ${repResult.score}/100`,
    );
  else core.info(`BioTrace: ${status}. Score: ${repResult.score}/100`);
  return report;
}
