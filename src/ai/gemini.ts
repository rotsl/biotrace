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

export interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
  maxRequestSize: number;
}

// Excludes embedding/audio/vision/image-only variants and unpinned
// experimental or preview snapshots (kept only as a last resort so the
// auto-picked default doesn't silently ride a moving preview target).
const EXCLUDED_MODEL_PATTERN = /embedding|aqa|vision|imagen|veo|tts|-8b$/i;
const EXPERIMENTAL_PATTERN = /-exp$|-preview$/i;

export function pickDefaultGeminiModel(models: ModelInfo[]): string | null {
  const candidates = models.filter((m) => !EXCLUDED_MODEL_PATTERN.test(m.id));
  const stable = candidates.filter((m) => !EXPERIMENTAL_PATTERN.test(m.id));
  const pool = stable.length > 0 ? stable : candidates;
  const preferred =
    pool.find((m) => /^gemini-.*-flash$/i.test(m.id)) ??
    pool.find((m) => /^gemini-.*-pro$/i.test(m.id));
  return (preferred ?? pool[0])?.id ?? null;
}

export class GeminiProvider implements AIProvider {
  private cfg: GeminiConfig;
  constructor(cfg: GeminiConfig) {
    this.cfg = cfg;
  }
  resolveModel(model: string): void {
    this.cfg.model = model;
  }
  async listModels(): Promise<ModelInfo[]> {
    // Key travels as a query param for Gemini's REST API (no auth header
    // option) - never log this URL.
    const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/v1beta/models?key=${this.cfg.apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new AIProviderError(`Status ${resp.status}`, false);
    const data = (await resp.json()) as {
      models?: Array<{ name: string; supportedGenerationMethods?: string[] }>;
    };
    return (data.models ?? [])
      .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
      .map((m) => ({ id: m.name.replace(/^models\//, "") }));
  }
  async analyse(req: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const prompt = buildPrompt(req);
    const body = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: {
        parts: [
          {
            text: "You are a bioinformatics reproducibility assistant. Respond only with valid JSON. Never claim biological correctness. Always mark observations as requiring human verification.",
          },
        ],
      },
      generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
    };
    const bs = JSON.stringify(body);
    if (bs.length > this.cfg.maxRequestSize)
      throw new AIProviderError("Request too large", false);
    // Key travels as a query param for Gemini's REST API - never log this URL.
    const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/v1beta/models/${this.cfg.model}:generateContent?key=${this.cfg.apiKey}`;
    return withRetry(
      async () => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), this.cfg.timeout);
        let resp: Awaited<ReturnType<typeof fetch>>;
        try {
          resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
          candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
            finishReason?: string;
          }>;
        };
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;
        if (!text) {
          // A safety filter or hard token cutoff with no usable text is
          // pointless to retry - it will fail the same way every time.
          if (
            candidate?.finishReason === "SAFETY" ||
            candidate?.finishReason === "MAX_TOKENS"
          )
            throw new AIProviderError(
              `Blocked or truncated response (${candidate.finishReason})`,
              false,
            );
          throw new AIProviderError("Empty response", true);
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
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
