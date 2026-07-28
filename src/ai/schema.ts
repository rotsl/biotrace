import { z } from "zod";
const ObsSchema = z.object({
  title: z.string(),
  message: z.string(),
  confidence: z.number().min(0).max(1),
  paths: z.array(z.string()),
  requires_human_verification: z.literal(true),
});
const ClaimSchema = z.object({
  description: z.string(),
  evidence_path: z.string(),
  suggested_field: z.string(),
  suggested_operator: z.string(),
  suggested_value: z.unknown(),
});
const RespSchema = z.object({
  summary: z.string(),
  observations: z.array(ObsSchema),
  candidate_claims: z.array(ClaimSchema),
  reviewer_checklist: z.array(z.string()),
});
export function validateAIResponse(data: unknown): z.infer<typeof RespSchema> | null {
  try {
    return RespSchema.parse(data);
  } catch {
    return null;
  }
}
