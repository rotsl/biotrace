import type { AIAnalysisRequest } from "./types";
export function buildPrompt(req: AIAnalysisRequest): string {
  const tDesc: Record<string, string> = {
    pr_summary: "Summarize the scientific purpose of this PR.",
    method_drift: "Identify differences between changed methods and written methods.",
    claim_candidates: "Suggest claims that could be verified deterministically.",
    reviewer_checklist: "Suggest a reviewer checklist.",
  };
  return `Tasks:\n${req.tasks.map((t, i) => `${i + 1}. ${tDesc[t] ?? t}`).join("\n")}\n\nChanged files:\n${req.changedFiles.map((f) => `- ${f}`).join("\n")}\n\nPatch:\n${req.patchContent}\n\nFindings:\n${req.findings.map((f) => `- [${f.severity}] ${f.title}: ${f.message}`).join("\n")}\n\nConfig: ${req.configSummary}\n\nRespond with JSON: {"summary":"...","observations":[{"title":"...","message":"...","confidence":0.0-1.0,"paths":["..."],"requires_human_verification":true}],"candidate_claims":[...],"reviewer_checklist":["..."]}\nIMPORTANT: Never claim biological correctness. Always requires_human_verification=true.`;
}
