import type { AIProvider, ModelInfo } from "./types";
import { OpenAICompatibleProvider, pickDefaultModel } from "./openai-compatible";
import { AnthropicProvider, pickDefaultAnthropicModel } from "./anthropic";
import { GeminiProvider, pickDefaultGeminiModel } from "./gemini";

export const AI_PROVIDER_KINDS = ["openai-compatible", "anthropic", "gemini"] as const;
export type AIProviderKind = (typeof AI_PROVIDER_KINDS)[number];

const DEFAULT_BASE_URLS: Record<AIProviderKind, string> = {
  "openai-compatible": "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com",
  gemini: "https://generativelanguage.googleapis.com",
};

const CONVENTIONAL_KEY_ENV_VARS: Record<AIProviderKind, string> = {
  "openai-compatible": "BIOTRACE_OPENAI_API_KEY",
  anthropic: "BIOTRACE_ANTHROPIC_API_KEY",
  gemini: "BIOTRACE_GEMINI_API_KEY",
};

export function isAIProviderKind(value: string): value is AIProviderKind {
  return (AI_PROVIDER_KINDS as readonly string[]).includes(value);
}

export function conventionalKeyEnvVar(kind: AIProviderKind): string {
  return CONVENTIONAL_KEY_ENV_VARS[kind];
}

export interface CreateProviderOptions {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeout: number;
  maxRetries: number;
  maxRequestSize: number;
}

export function createProvider(
  kind: AIProviderKind,
  opts: CreateProviderOptions,
): AIProvider {
  const cfg = {
    apiKey: opts.apiKey,
    model: opts.model,
    baseUrl: opts.baseUrl || DEFAULT_BASE_URLS[kind],
    timeout: opts.timeout,
    maxRetries: opts.maxRetries,
    maxRequestSize: opts.maxRequestSize,
  };
  switch (kind) {
    case "anthropic":
      return new AnthropicProvider(cfg);
    case "gemini":
      return new GeminiProvider(cfg);
    case "openai-compatible":
      return new OpenAICompatibleProvider(cfg);
  }
}

export function pickDefaultModelFor(
  kind: AIProviderKind,
  models: ModelInfo[],
): string | null {
  switch (kind) {
    case "anthropic":
      return pickDefaultAnthropicModel(models);
    case "gemini":
      return pickDefaultGeminiModel(models);
    case "openai-compatible":
      return pickDefaultModel(models);
  }
}
