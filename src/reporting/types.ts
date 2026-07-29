export type Severity = "info" | "warning" | "error";
export type ModuleName =
  | "metadata"
  | "fasta"
  | "fastq"
  | "lineage"
  | "claim"
  | "figure"
  | "reproducibility"
  | "ai"
  | "security";
export interface Finding {
  id: string;
  module: ModuleName;
  severity: Severity;
  title: string;
  message: string;
  path?: string;
  startLine?: number;
  endLine?: number;
  label?: string;
  deterministic: boolean;
  confidence?: number;
  evidence?: Record<string, unknown>;
  remediation?: string;
}
export interface ClaimResult {
  id: string;
  status: "verified" | "failed" | "missing_evidence" | "ambiguous" | "error";
  assertions: Array<{
    field: string;
    operator: string;
    expected: unknown;
    observed: unknown;
    passed: boolean;
  }>;
  message?: string;
}
export interface LineageResult {
  id: string;
  status: string;
  details: string[];
}
export interface ScoreComponent {
  name: string;
  weight: number;
  result: "passed" | "failed" | "not_applicable";
  reason: string;
}
export interface BioTraceReport {
  schema_version: string;
  generated_at: string;
  status: "passed" | "warning" | "error" | "info";
  repository?: { owner: string; name: string };
  pull_request?: { number: number; base_sha: string; head_sha: string };
  score: { reproducibility: number; components: ScoreComponent[] };
  summary: {
    files_checked: number;
    claims_checked: number;
    figures_checked: number;
    findings: number;
    blocking_findings: number;
  };
  findings: Finding[];
  claims: ClaimResult[];
  lineage: LineageResult[];
  ai: {
    enabled: boolean;
    status: string;
    provider?: string;
    advisory_only: boolean;
    observations?: Array<{
      title: string;
      message: string;
      confidence: number;
      paths: string[];
      requires_human_verification: boolean;
    }>;
  };
}
