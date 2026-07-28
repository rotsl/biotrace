import { describe, it, expect, vi, afterEach } from "vitest";
import { OpenAICompatibleProvider } from "../../src/ai/openai-compatible";
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

function chatCompletion(content: unknown) {
  return jsonResponse({ choices: [{ message: { content: JSON.stringify(content) } }] });
}

function provider(
  overrides: Partial<{ maxRetries: number; maxRequestSize: number }> = {},
) {
  return new OpenAICompatibleProvider({
    apiKey: "key",
    baseUrl: "https://example.com/v1",
    model: "gpt-4o-mini",
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

describe("OpenAICompatibleProvider", () => {
  it("returns a parsed, schema-valid response on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(chatCompletion(validPayload));
    vi.stubGlobal("fetch", fetchMock);
    const result = await provider().analyse(req);
    expect(result).toEqual(validPayload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
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
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ choices: [{ message: { content: "not json" } }] }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider({ maxRetries: 2 }).analyse(req)).rejects.toThrow(
      "Invalid JSON",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws immediately when the response fails schema validation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(chatCompletion({ not: "valid" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider({ maxRetries: 2 }).analyse(req)).rejects.toThrow(
      "Schema mismatch",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries on a 429 and succeeds on the next attempt", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 429))
      .mockResolvedValueOnce(chatCompletion(validPayload));
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
      .mockResolvedValueOnce(chatCompletion(validPayload));
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
});
