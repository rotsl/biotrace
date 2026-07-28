import type { AIProvider, AIAnalysisRequest, AIAnalysisResponse } from "./types";
export class NoOpAIProvider implements AIProvider {
  async analyse(_: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    return {
      summary: "",
      observations: [],
      candidate_claims: [],
      reviewer_checklist: [],
    };
  }
}
export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
