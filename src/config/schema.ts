import { z } from "zod";
const MinGrpSz = z.object({
  group_by: z.string(),
  value: z.number().int().positive(),
  severity: z.enum(["info", "warning", "error"]).optional(),
});
const MetaF = z.object({
  path: z.string().min(1),
  delimiter: z.enum(["auto", ",", "\t", ";"]).optional(),
  id_column: z.string().optional(),
  required_columns: z.array(z.string()).optional(),
  non_null: z.array(z.string()).optional(),
  unique: z.array(z.string()).optional(),
  allowed_values: z.record(z.string(), z.array(z.string())).optional(),
  minimum_group_size: MinGrpSz.optional(),
});
const FastaF = z.object({
  glob: z.string().min(1),
  alphabet: z.enum(["dna", "rna", "protein", "unrestricted"]).optional(),
  unique_ids: z.boolean().optional(),
  reject_empty_sequences: z.boolean().optional(),
  minimum_length: z.number().int().positive().optional(),
  maximum_length: z.number().int().positive().optional(),
  loss_threshold: z.number().min(0).max(1).optional(),
});
const FastqF = z.object({
  glob: z.string().min(1),
  alphabet: z.enum(["dna", "rna", "unrestricted"]).optional(),
  unique_ids: z.boolean().optional(),
  reject_empty_sequences: z.boolean().optional(),
  maximum_records: z.number().int().positive().optional(),
});
const Lin = z.object({
  id: z.string().min(1),
  inputs: z.array(z.string()),
  code: z.array(z.string()),
  outputs: z.array(z.string()),
  environment: z.array(z.string()).optional(),
  claims: z.array(z.string()).optional(),
  stale_output_severity: z.enum(["info", "warning", "error"]).optional(),
  untraceable_output_severity: z.enum(["info", "warning", "error"]).optional(),
});
const Assert = z.object({
  field: z.string().min(1),
  operator: z.enum(["==", "!=", ">", ">=", "<", "<=", "in", "not_in", "matches"]),
  value: z.unknown(),
});
const Claim = z.object({
  id: z.string().min(1),
  source: z.object({ path: z.string().min(1), marker: z.string().optional() }),
  evidence: z.object({
    path: z.string().min(1),
    match: z.record(z.string(), z.string()).optional(),
  }),
  assertions: z.array(Assert).min(1),
});
const Fig = z.object({
  path: z.string().min(1),
  generated_by: z.array(z.string()).optional(),
  depends_on: z.array(z.string()).optional(),
  caption: z
    .object({ path: z.string().min(1), marker: z.string().optional() })
    .optional(),
  require_provenance_sidecar: z.boolean().optional(),
});
const RepW = z.object({
  environment_definition: z.number().nonnegative().optional(),
  dependency_lock: z.number().nonnegative().optional(),
  dependency_constraints: z.number().nonnegative().optional(),
  random_seed: z.number().nonnegative().optional(),
  documented_entrypoint: z.number().nonnegative().optional(),
  output_manifest: z.number().nonnegative().optional(),
  figure_provenance: z.number().nonnegative().optional(),
  data_checksums: z.number().nonnegative().optional(),
  session_information: z.number().nonnegative().optional(),
});
const Rep = z.object({
  require_environment: z.boolean().optional(),
  require_lockfile: z.boolean().optional(),
  entrypoints: z.array(z.string()).optional(),
  seed_patterns: z.array(z.string()).optional(),
  require_session_info: z.boolean().optional(),
  weights: RepW.optional(),
});
const Lab = z.object({
  create: z.boolean().optional(),
  prefix: z.string().optional(),
  colours: z
    .object({
      passed: z.string().optional(),
      warning: z.string().optional(),
      blocked: z.string().optional(),
      informational: z.string().optional(),
      ai: z.string().optional(),
    })
    .optional(),
});
const Com = z.object({
  mode: z.enum(["update-existing", "create-new", "disabled"]).optional(),
  include_passed_checks: z.boolean().optional(),
  maximum_findings: z.number().int().positive().optional(),
});
const AiProviderKind = z.enum(["openai-compatible", "anthropic", "gemini"]);
const Ai = z.object({
  enabled: z.enum(["auto", "true", "false"]).optional(),
  provider: z.union([AiProviderKind, z.array(AiProviderKind)]).optional(),
  model: z.string().optional(),
  base_url: z.string().optional(),
  tasks: z
    .array(
      z.enum(["pr_summary", "method_drift", "claim_candidates", "reviewer_checklist"]),
    )
    .optional(),
  fail_open: z.boolean().optional(),
  minimum_confidence: z.number().min(0).max(1).optional(),
  maximum_changed_files: z.number().int().positive().optional(),
  maximum_patch_bytes: z.number().int().positive().optional(),
  never_send: z.array(z.string()).optional(),
});
export const BioTraceConfigSchema = z
  .object({
    version: z.literal(1),
    repository: z
      .object({
        languages: z.array(z.enum(["R", "Python"])).optional(),
        organisms: z
          .array(
            z.object({
              scientific_name: z.string(),
              taxonomy_id: z.number().int().positive().optional(),
            }),
          )
          .optional(),
        analysis_types: z.array(z.string()).optional(),
      })
      .optional(),
    files: z
      .object({
        metadata: z.array(MetaF).optional(),
        fasta: z.array(FastaF).optional(),
        fastq: z.array(FastqF).optional(),
      })
      .optional(),
    lineage: z.array(Lin).optional(),
    reproducibility: Rep.optional(),
    claims: z.array(Claim).optional(),
    figures: z.array(Fig).optional(),
    labels: Lab.optional(),
    comment: Com.optional(),
    ai: Ai.optional(),
  })
  .strict();
