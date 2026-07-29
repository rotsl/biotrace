import type { BioTraceConfig, ReproducibilityWeights, LabelColours } from "./types";
export const DEFAULT_WEIGHTS: Required<ReproducibilityWeights> = {
  environment_definition: 15,
  dependency_lock: 15,
  dependency_constraints: 10,
  random_seed: 10,
  documented_entrypoint: 15,
  output_manifest: 15,
  figure_provenance: 10,
  data_checksums: 5,
  session_information: 5,
};
export const DEFAULT_LABEL_COLOURS: Required<LabelColours> = {
  passed: "1f883d",
  warning: "bf8700",
  blocked: "d1242f",
  informational: "0969da",
  ai: "8250df",
};
export const DEFAULT_SEED_PATTERNS = [
  "set.seed(",
  "random_state=",
  "numpy.random.seed(",
  "default_rng(",
];
export const DEFAULT_NEVER_SEND = [
  "data/raw/**",
  "**/*.fastq",
  "**/*.fastq.gz",
  "**/*.fq",
  "**/*.fq.gz",
  "**/*.bam",
  "**/*.cram",
  "**/*.h5ad",
  "**/*.rds",
  "**/*.RData",
  "**/*.Rhistory",
  "**/.env*",
  "**/*secret*",
];
export const DEFAULT_CONFIG: BioTraceConfig = {
  version: 1,
  files: {},
  lineage: [],
  claims: [],
  figures: [],
  reproducibility: {
    require_environment: true,
    require_lockfile: true,
    seed_patterns: DEFAULT_SEED_PATTERNS,
    weights: DEFAULT_WEIGHTS,
  },
  labels: { create: true, prefix: "", colours: DEFAULT_LABEL_COLOURS },
  comment: {
    mode: "update-existing",
    include_passed_checks: false,
    maximum_findings: 30,
  },
  ai: {
    enabled: "auto",
    provider: "openai-compatible",
    tasks: ["pr_summary", "method_drift", "claim_candidates", "reviewer_checklist"],
    fail_open: true,
    minimum_confidence: 0.8,
    maximum_changed_files: 100,
    maximum_patch_bytes: 150000,
    never_send: DEFAULT_NEVER_SEND,
  },
};
