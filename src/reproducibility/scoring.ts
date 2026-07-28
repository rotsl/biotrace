import type { BioTraceConfig } from "../config/types";
import type { ScoreComponent, ReproducibilityResult } from "./types";
import { detectPythonEnv } from "./python";
import { detectREnv } from "./r";
import { checkContainers } from "./containers";
import { checkSeeds } from "./seeds";
import { safeFileExists } from "../utils/files";
import { DEFAULT_WEIGHTS } from "../config/defaults";
export function calculateReproducibilityScore(
  config: BioTraceConfig,
  workspace: string,
  figProv: { path: string; hasProvenance: boolean }[],
): ReproducibilityResult {
  const w = { ...DEFAULT_WEIGHTS, ...config.reproducibility?.weights };
  const components: ScoreComponent[] = [];
  const langs = config.repository?.languages ?? [];
  const isPy = langs.includes("Python"),
    isR = langs.includes("R");
  let hasEnv = false;
  if (isPy) hasEnv = detectPythonEnv(workspace).hasEnvironment;
  if (isR) hasEnv = hasEnv || detectREnv(workspace).hasEnvironment;
  if (!isPy && !isR)
    hasEnv = [
      "requirements.txt",
      "pyproject.toml",
      "DESCRIPTION",
      "renv.lock",
      "Dockerfile",
    ].some((f) => safeFileExists(f, workspace));
  components.push({
    name: "environment_definition",
    weight: w.environment_definition,
    result: hasEnv ? "passed" : "failed",
    reason: hasEnv ? "Environment found" : "No environment definition",
  });
  let hasLock = false;
  if (isPy) hasLock = detectPythonEnv(workspace).hasLockFile;
  if (isR) hasLock = hasLock || detectREnv(workspace).hasLockFile;
  const lockReq = config.reproducibility?.require_lockfile ?? true;
  components.push({
    name: "dependency_lock",
    weight: w.dependency_lock,
    result: lockReq ? (hasLock ? "passed" : "failed") : "not_applicable",
    reason: !lockReq ? "Not required" : hasLock ? "Lock found" : "No lock file",
  });
  let hasC = false;
  if (isPy) hasC = detectPythonEnv(workspace).hasConstraints;
  if (isR) hasC = hasC || detectREnv(workspace).hasConstraints;
  components.push({
    name: "dependency_constraints",
    weight: w.dependency_constraints,
    result: hasC ? "passed" : "failed",
    reason: hasC ? "Constraints found" : "No constraints",
  });
  const ents = config.reproducibility?.entrypoints ?? [];
  const seedPats = config.reproducibility?.seed_patterns ?? [];
  const sr = checkSeeds(ents, seedPats, workspace);
  const isStoch = seedPats.length > 0;
  components.push({
    name: "random_seed",
    weight: w.random_seed,
    result: isStoch ? (sr.hasSeed ? "passed" : "failed") : "not_applicable",
    reason: !isStoch ? "No seed patterns" : sr.hasSeed ? "Seed found" : "No seed",
  });
  const hasEnt = ents.length > 0 && ents.some((e) => safeFileExists(e, workspace));
  components.push({
    name: "documented_entrypoint",
    weight: w.documented_entrypoint,
    result: hasEnt ? "passed" : "failed",
    reason: hasEnt ? "Entrypoint found" : "No entrypoint",
  });
  const hasLin = (config.lineage?.length ?? 0) > 0;
  components.push({
    name: "output_manifest",
    weight: w.output_manifest,
    result: hasLin ? "passed" : "not_applicable",
    reason: hasLin ? "Lineage configured" : "No lineage",
  });
  const totalFig = figProv.length,
    provFig = figProv.filter((f) => f.hasProvenance).length;
  components.push({
    name: "figure_provenance",
    weight: w.figure_provenance,
    result:
      totalFig > 0 ? (provFig === totalFig ? "passed" : "failed") : "not_applicable",
    reason: totalFig === 0 ? "No figures" : `${provFig}/${totalFig} have provenance`,
  });
  const hasHash = figProv.some((f) => f.hasProvenance);
  components.push({
    name: "data_checksums",
    weight: w.data_checksums,
    result: hasHash ? "passed" : "not_applicable",
    reason: hasHash ? "Checksums recorded" : "No checksums",
  });
  const reqSI = config.reproducibility?.require_session_info ?? false;
  components.push({
    name: "session_information",
    weight: w.session_information,
    result: reqSI ? "failed" : "not_applicable",
    reason: reqSI ? "Required but not checked" : "Not required",
  });
  const cr = checkContainers(workspace);
  if (cr.hasDockerfile && cr.usesUnboundedTag) {
    const ec = components.find((c) => c.name === "environment_definition");
    if (ec && ec.result === "passed") {
      ec.result = "failed";
      ec.reason += " (unbounded Docker tag)";
    }
  }
  let applicable = 0,
    passed = 0;
  for (const c of components)
    if (c.result !== "not_applicable") {
      applicable += c.weight;
      if (c.result === "passed") passed += c.weight;
    }
  const score = applicable > 0 ? Math.round((passed / applicable) * 100) : 100;
  return { score, components };
}
