import { describe, it, expect } from "vitest";
import {
  createProvider,
  conventionalKeyEnvVar,
  isAIProviderKind,
  pickDefaultModelFor,
} from "../../src/ai/factory";
import { OpenAICompatibleProvider } from "../../src/ai/openai-compatible";
import { AnthropicProvider } from "../../src/ai/anthropic";
import { GeminiProvider } from "../../src/ai/gemini";

const baseOpts = {
  apiKey: "key",
  model: "m",
  timeout: 30000,
  maxRetries: 0,
  maxRequestSize: 500000,
};

describe("createProvider", () => {
  it("creates an OpenAICompatibleProvider for openai-compatible", () => {
    expect(createProvider("openai-compatible", baseOpts)).toBeInstanceOf(
      OpenAICompatibleProvider,
    );
  });
  it("creates an AnthropicProvider for anthropic", () => {
    expect(createProvider("anthropic", baseOpts)).toBeInstanceOf(AnthropicProvider);
  });
  it("creates a GeminiProvider for gemini", () => {
    expect(createProvider("gemini", baseOpts)).toBeInstanceOf(GeminiProvider);
  });
});

describe("conventionalKeyEnvVar", () => {
  it("maps each provider kind to its documented env var name", () => {
    expect(conventionalKeyEnvVar("openai-compatible")).toBe("BIOTRACE_OPENAI_API_KEY");
    expect(conventionalKeyEnvVar("anthropic")).toBe("BIOTRACE_ANTHROPIC_API_KEY");
    expect(conventionalKeyEnvVar("gemini")).toBe("BIOTRACE_GEMINI_API_KEY");
  });
});

describe("isAIProviderKind", () => {
  it("accepts known kinds and rejects unknown strings", () => {
    expect(isAIProviderKind("openai-compatible")).toBe(true);
    expect(isAIProviderKind("anthropic")).toBe(true);
    expect(isAIProviderKind("gemini")).toBe(true);
    expect(isAIProviderKind("gpt")).toBe(false);
  });
});

describe("pickDefaultModelFor", () => {
  it("dispatches to the right provider's default-model heuristic", () => {
    expect(pickDefaultModelFor("gemini", [{ id: "gemini-2.0-flash" }])).toBe(
      "gemini-2.0-flash",
    );
    expect(pickDefaultModelFor("anthropic", [{ id: "claude-sonnet-4-20250514" }])).toBe(
      "claude-sonnet-4-20250514",
    );
    expect(pickDefaultModelFor("openai-compatible", [{ id: "gpt-4o-mini" }])).toBe(
      "gpt-4o-mini",
    );
  });
});
