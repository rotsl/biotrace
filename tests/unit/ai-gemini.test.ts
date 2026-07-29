import { describe, it, expect, vi, afterEach } from "vitest";
import { GeminiProvider, pickDefaultGeminiModel } from "../../src/ai/gemini";
import { AIProviderError } from "../../src/ai/provider";
import type { AIAnalysisRequest } from "../../src/ai/types";

const req: AIAnalysisRequest = {
  changedFiles: ["a.R"],
  patchContent: "diff",
  configSummary: "{}",
  findings: [],
  tasks: ["pr_summary"],
};

const validPayload = {
  summary: "s",
  observations: [],
  candidate_claims: [],
  reviewer_checklist: [],
};

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

function generateContentResponse(payload: unknown, finishReason = "STOP") {
  return jsonResponse({
    candidates: [
      {
        content: { parts: [{ text: JSON.stringify(payload) }] },
        finishReason,
      },
    ],
  });
}

function provider(
  overrides: Partial<{ maxRetries: number; maxRequestSize: number }> = {},
) {
  return new GeminiProvider({
    apiKey: "key",
    baseUrl: "https://example.com",
    model: "gemini-2.0-flash",
    timeout: 30000,
    maxRetries: 0,
    maxRequestSize: 500000,
    ...overrides,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("GeminiProvider", () => {
  it("returns a parsed, schema-valid response on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(generateContentResponse(validPayload));
    vi.stubGlobal("fetch", fetchMock);
    const result = await provider().analyse(req);
    expect(result).toEqual(validPayload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/v1beta/models/gemini-2.0-flash:generateContent?key=key",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("passes responseMimeType: application/json in generationConfig", async () => {
    const fetchMock = vi.fn().mockResolvedValue(generateContentResponse(validPayload));
    vi.stubGlobal("fetch", fetchMock);
    await provider().analyse(req);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      generationConfig: { responseMimeType: string };
    };
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("throws immediately when the request body exceeds maxRequestSize", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider({ maxRequestSize: 10 }).analyse(req)).rejects.toThrow(
      "Request too large",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws immediately on a non-retryable status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 401));
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider().analyse(req)).rejects.toThrow("Status 401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws immediately on invalid JSON content, without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        candidates: [
          { content: { parts: [{ text: "not json" }] }, finishReason: "STOP" },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider({ maxRetries: 2 }).analyse(req)).rejects.toThrow(
      "Invalid JSON",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws immediately when the response fails schema validation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(generateContentResponse({ not: "valid" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider({ maxRetries: 2 }).analyse(req)).rejects.toThrow(
      "Schema mismatch",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("treats a SAFETY finish reason with no text as non-retryable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ candidates: [{ content: {}, finishReason: "SAFETY" }] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider({ maxRetries: 2 }).analyse(req)).rejects.toThrow(
      "Blocked or truncated response",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on a 429 and succeeds on the next attempt", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 429))
      .mockResolvedValueOnce(generateContentResponse(validPayload));
    vi.stubGlobal("fetch", fetchMock);
    const promise = provider({ maxRetries: 1 }).analyse(req);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual(validPayload);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("exhausts retries and throws the last retryable error", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, false, 500));
    vi.stubGlobal("fetch", fetchMock);
    const promise = provider({ maxRetries: 2 }).analyse(req);
    const assertion = expect(promise).rejects.toThrow("Status 500");
    await vi.runAllTimersAsync();
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("treats an aborted fetch as a retryable timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new DOMException("aborted", "AbortError"))
      .mockResolvedValueOnce(generateContentResponse(validPayload));
    vi.stubGlobal("fetch", fetchMock);
    const promise = provider({ maxRetries: 1 }).analyse(req);
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual(validPayload);
  });

  it("wraps unexpected thrown errors as retryable AIProviderError", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    const promise = provider({ maxRetries: 0 }).analyse(req);
    const assertion = expect(promise).rejects.toBeInstanceOf(AIProviderError);
    await vi.runAllTimersAsync();
    await assertion;
  });

  describe("listModels", () => {
    it("fetches, filters to generateContent-capable models, and strips the models/ prefix", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          models: [
            {
              name: "models/gemini-2.0-flash",
              supportedGenerationMethods: ["generateContent"],
            },
            {
              name: "models/text-embedding-004",
              supportedGenerationMethods: ["embedContent"],
            },
          ],
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const models = await provider().listModels();
      expect(models).toEqual([{ id: "gemini-2.0-flash" }]);
      expect(fetchMock).toHaveBeenCalledWith("https://example.com/v1beta/models?key=key");
    });
  });

  describe("pickDefaultGeminiModel", () => {
    it("prefers a flash model when present", () => {
      expect(
        pickDefaultGeminiModel([{ id: "gemini-2.0-pro" }, { id: "gemini-2.0-flash" }]),
      ).toBe("gemini-2.0-flash");
    });

    it("falls back to a pro model when no flash model exists", () => {
      expect(pickDefaultGeminiModel([{ id: "gemini-2.0-pro" }])).toBe("gemini-2.0-pro");
    });

    it("excludes embedding/vision/tts variants", () => {
      expect(
        pickDefaultGeminiModel([
          { id: "text-embedding-004" },
          { id: "gemini-2.0-flash" },
        ]),
      ).toBe("gemini-2.0-flash");
    });

    it("avoids experimental/preview models unless nothing else qualifies", () => {
      expect(pickDefaultGeminiModel([{ id: "gemini-2.0-flash-exp" }])).toBe(
        "gemini-2.0-flash-exp",
      );
      expect(
        pickDefaultGeminiModel([
          { id: "gemini-2.0-flash-exp" },
          { id: "gemini-2.0-flash" },
        ]),
      ).toBe("gemini-2.0-flash");
    });

    it("returns null for an empty list", () => {
      expect(pickDefaultGeminiModel([])).toBeNull();
    });
  });
});
