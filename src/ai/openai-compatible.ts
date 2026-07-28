import type { AIProvider, AIAnalysisRequest, AIAnalysisResponse } from "./types";
import { AIProviderError } from "./provider";
import { validateAIResponse } from "./schema";
import { buildPrompt } from "./prompts";
export interface OpenAIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  timeout: number;
  maxRetries: number;
  maxRequestSize: number;
}
export class OpenAICompatibleProvider implements AIProvider {
  private cfg: OpenAIConfig;
  constructor(cfg: OpenAIConfig) {
    this.cfg = cfg;
  }
  async analyse(req: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const prompt = buildPrompt(req);
    const body = {
      model: this.cfg.model,
      messages: [
        {
          role: "system",
          content:
            "You are a bioinformatics reproducibility assistant. Respond only with valid JSON. Never claim biological correctness. Always mark observations as requiring human verification.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    };
    const bs = JSON.stringify(body);
    if (bs.length > this.cfg.maxRequestSize)
      throw new AIProviderError("Request too large", false);
    const url = `${this.cfg.baseUrl.replace(/\/$/, "")}/chat/completions`;
    let lastErr: Error | null = null;
    for (let att = 0; att <= this.cfg.maxRetries; att++) {
      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), this.cfg.timeout);
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.cfg.apiKey}`,
          },
          body: bs,
          signal: ctrl.signal,
        });
        clearTimeout(tid);
        if (!resp.ok) {
          if (resp.status === 429 || resp.status >= 500) {
            lastErr = new AIProviderError(`Status ${resp.status}`, true);
            await this.bo(att);
            continue;
          }
          throw new AIProviderError(`Status ${resp.status}`, false);
        }
        const data = (await resp.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = data.choices?.[0]?.message?.content;
        if (!content) throw new AIProviderError("Empty response", true);
        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          throw new AIProviderError("Invalid JSON", false);
        }
        const valid = validateAIResponse(parsed);
        if (!valid) throw new AIProviderError("Schema mismatch", false);
        return valid;
      } catch (err) {
        if (err instanceof AIProviderError) {
          if (!err.retryable) throw err;
          lastErr = err;
        } else if (err instanceof DOMException && err.name === "AbortError")
          lastErr = new AIProviderError("Timeout", true);
        else
          lastErr = new AIProviderError(
            `Failed: ${err instanceof Error ? err.message : String(err)}`,
            true,
          );
        await this.bo(att);
      }
    }
    throw lastErr ?? new AIProviderError("Failed after retries", false);
  }
  private async bo(att: number): Promise<void> {
    await new Promise((r) =>
      setTimeout(r, 1000 * Math.pow(2, att) + Math.random() * 500),
    );
  }
}
