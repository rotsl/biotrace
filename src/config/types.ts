export interface OrganismConfig {
  scientific_name: string;
  taxonomy_id?: number;
}
export interface MinimumGroupSizeConfig {
  group_by: string;
  value: number;
  severity?: "info" | "warning" | "error";
}
export interface MetadataFileConfig {
  path: string;
  delimiter?: "auto" | "," | "\t" | ";";
  id_column?: string;
  required_columns?: string[];
  non_null?: string[];
  unique?: string[];
  allowed_values?: Record<string, string[]>;
  minimum_group_size?: MinimumGroupSizeConfig;
}
export interface FastaFileConfig {
  glob: string;
  alphabet?: "dna" | "rna" | "protein" | "unrestricted";
  unique_ids?: boolean;
  reject_empty_sequences?: boolean;
  minimum_length?: number;
  maximum_length?: number;
  loss_threshold?: number;
}
export interface FastqFileConfig {
  glob: string;
  alphabet?: "dna" | "rna" | "unrestricted";
  unique_ids?: boolean;
  reject_empty_sequences?: boolean;
  maximum_records?: number;
}
export interface LineageConfig {
  id: string;
  inputs: string[];
  code: string[];
  outputs: string[];
  environment?: string[];
  claims?: string[];
  stale_output_severity?: "info" | "warning" | "error";
  untraceable_output_severity?: "info" | "warning" | "error";
}
export interface AssertionConfig {
  field: string;
  operator: "==" | "!=" | ">" | ">=" | "<" | "<=" | "in" | "not_in" | "matches";
  value: unknown;
}
export interface ClaimConfig {
  id: string;
  source: { path: string; marker?: string };
  evidence: { path: string; match?: Record<string, string> };
  assertions: AssertionConfig[];
}
export interface FigureCaptionConfig {
  path: string;
  marker?: string;
}
export interface FigureConfig {
  path: string;
  generated_by?: string[];
  depends_on?: string[];
  caption?: FigureCaptionConfig;
  require_provenance_sidecar?: boolean;
}
export interface ReproducibilityWeights {
  environment_definition?: number;
  dependency_lock?: number;
  dependency_constraints?: number;
  random_seed?: number;
  documented_entrypoint?: number;
  output_manifest?: number;
  figure_provenance?: number;
  data_checksums?: number;
  session_information?: number;
}
export interface ReproducibilityConfig {
  require_environment?: boolean;
  require_lockfile?: boolean;
  entrypoints?: string[];
  seed_patterns?: string[];
  require_session_info?: boolean;
  weights?: ReproducibilityWeights;
}
export interface LabelColours {
  passed?: string;
  warning?: string;
  blocked?: string;
  informational?: string;
  ai?: string;
}
export interface LabelsConfig {
  create?: boolean;
  prefix?: string;
  colours?: LabelColours;
}
export interface CommentConfig {
  mode?: "update-existing" | "create-new" | "disabled";
  include_passed_checks?: boolean;
  maximum_findings?: number;
}
export interface AiConfig {
  enabled?: "auto" | "true" | "false";
  provider?: string;
  api_key_env?: string;
  model?: string;
  base_url?: string;
  tasks?: string[];
  fail_open?: boolean;
  minimum_confidence?: number;
  maximum_changed_files?: number;
  maximum_patch_bytes?: number;
  never_send?: string[];
}
export interface BioTraceConfig {
  version: number;
  repository?: {
    languages?: string[];
    organisms?: OrganismConfig[];
    analysis_types?: string[];
  };
  files?: {
    metadata?: MetadataFileConfig[];
    fasta?: FastaFileConfig[];
    fastq?: FastqFileConfig[];
  };
  lineage?: LineageConfig[];
  reproducibility?: ReproducibilityConfig;
  claims?: ClaimConfig[];
  figures?: FigureConfig[];
  labels?: LabelsConfig;
  comment?: CommentConfig;
  ai?: AiConfig;
}
