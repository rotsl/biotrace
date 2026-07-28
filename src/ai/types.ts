export interface AIAnalysisRequest {
  changedFiles: string[];
  patchContent: string;
  configSummary: string;
  findings: Array<{ title: string; message: string; severity: string }>;
  tasks: string[];
}
export interface AIObservation {
  title: string;
  message: string;
  confidence: number;
  paths: string[];
  requires_human_verification: boolean;
}
export interface AIAnalysisResponse {
  summary: string;
  observations: AIObservation[];
  candidate_claims: Array<{
    description: string;
    evidence_path: string;
    suggested_field: string;
    suggested_operator: string;
    suggested_value?: unknown;
  }>;
  reviewer_checklist: string[];
}
export interface AIProvider {
  analyse(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
}
