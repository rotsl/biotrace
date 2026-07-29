import type {
  AIProvider,
  AIAnalysisRequest,
  AIAnalysisResponse,
  ModelInfo,
} from "./types";
import { AIProviderError } from "./provider";
import { validateAIResponse } from "./schema";
import { buildPrompt } from "./prompts";
import { withRetry } from "./http-retry";

export interface AnthropicConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
  maxRequestSize: number;
}

const ANTHROPIC_VERSION = "2023-06-01";

// Anthropic's model list has no embeddings/audio/vision-only tier to
// exclude; only legacy pre-Claude-2 families are worth skipping.
const EXCLUDED_MODEL_PATTERN = /^claude-1|instant/i;

export function pickDefaultAnthropicModel(models: ModelInfo[]): string | null {
  const candidates = models.filter((m) => !EXCLUDED_MODEL_PATTERN.test(m.id));
  const preferred =
    candidates.find((m) => /^claude-.*sonnet-4/i.test(m.id)) ??
    candidates.find((m) => /sonnet/i.test(m.id));
  // The API returns models newest-first, so the first remaining entry is a
  // reasonable fallback when no sonnet variant is present.
  return (preferred ?? candidates[0])?.id ?? null;
}

export class AnthropicProvider implements AIProvider {
  private cfg: AnthropicConfig;
  constructor(cfg: AnthropicConfig) {
    this.cfg = cfg;
  }
  resolveModel(model: string): void {
    this.cfg.model = model;
  }
  async listModels(): Promise<ModelInfo[]> {
    const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/v1/models`;
    const resp = await fetch(url, {
      headers: {
        "x-api-key": this.cfg.apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
      },
    });
    if (!resp.ok) throw new AIProviderError(`Status ${resp.status}`, false);
    const data = (await resp.json()) as { data?: Array<{ id: string }> };
    return (data.data ?? []).map((m) => ({ id: m.id }));
  }
  async analyse(req: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const prompt = buildPrompt(req);
    const body = {
      model: this.cfg.model,
      max_tokens: 4096,
      system:
        "You are a bioinformatics reproducibility assistant. Respond only with valid JSON, no prose, no markdown code fences. Never claim biological correctness. Always mark observations as requiring human verification.",
      messages: [
        { role: "user", content: prompt },
        // Assistant-prefill: forces the completion to continue a JSON
        // object rather than open with prose or a markdown fence. The
        // response text is reconstructed as "{" + text before parsing.
        { role: "assistant", content: "{" },
      ],
    };
    const bs = JSON.stringify(body);
    if (bs.length > this.cfg.maxRequestSize)
      throw new AIProviderError("Request too large", false);
    const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/v1/messages`;
    return withRetry(
      async () => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), this.cfg.timeout);
        let resp: Awaited<ReturnType<typeof fetch>>;
        try {
          resp = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": this.cfg.apiKey,
              "anthropic-version": ANTHROPIC_VERSION,
            },
            body: bs,
            signal: ctrl.signal,
          });
        } finally {
          clearTimeout(tid);
        }
        if (!resp.ok) {
          if (resp.status === 429 || resp.status >= 500)
            throw new AIProviderError(`Status ${resp.status}`, true);
          throw new AIProviderError(`Status ${resp.status}`, false);
        }
        const data = (await resp.json()) as {
          content?: Array<{ type?: string; text?: string }>;
        };
        const text = data.content?.[0]?.text;
        if (!text) throw new AIProviderError("Empty response", true);
        let parsed: unknown;
        try {
          parsed = JSON.parse("{" + text);
        } catch {
          throw new AIProviderError("Invalid JSON", false);
        }
        const valid = validateAIResponse(parsed);
        if (!valid) throw new AIProviderError("Schema mismatch", false);
        return valid;
      },
      { maxRetries: this.cfg.maxRetries },
    );
  }
}
