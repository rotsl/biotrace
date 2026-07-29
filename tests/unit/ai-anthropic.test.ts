import { describe, it, expect, vi, afterEach } from "vitest";
import { AnthropicProvider, pickDefaultAnthropicModel } from "../../src/ai/anthropic";
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

function messagesResponse(payload: unknown) {
  // The provider reconstructs JSON as "{" + text, so the fixture must omit
  // the leading "{" the same way the assistant-prefill trick does.
  const full = JSON.stringify(payload);
  return jsonResponse({ content: [{ type: "text", text: full.slice(1) }] });
}

function provider(
  overrides: Partial<{ maxRetries: number; maxRequestSize: number }> = {},
) {
  return new AnthropicProvider({
    apiKey: "key",
    baseUrl: "https://example.com",
    model: "claude-sonnet-4-20250514",
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

describe("AnthropicProvider", () => {
  it("returns a parsed, schema-valid response on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(messagesResponse(validPayload));
    vi.stubGlobal("fetch", fetchMock);
    const result = await provider().analyse(req);
    expect(result).toEqual(validPayload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/v1/messages",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uses x-api-key/anthropic-version headers, not Authorization", async () => {
    const fetchMock = vi.fn().mockResolvedValue(messagesResponse(validPayload));
    vi.stubGlobal("fetch", fetchMock);
    await provider().analyse(req);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("key");
    expect(headers["anthropic-version"]).toBeTruthy();
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("prefills the assistant turn with an opening brace", async () => {
    const fetchMock = vi.fn().mockResolvedValue(messagesResponse(validPayload));
    vi.stubGlobal("fetch", fetchMock);
    await provider().analyse(req);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as {
      messages: Array<{ role: string; content: string }>;
    };
    expect(body.messages.at(-1)).toEqual({ role: "assistant", content: "{" });
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
      .mockResolvedValue(jsonResponse({ content: [{ type: "text", text: "not json" }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(provider({ maxRetries: 2 }).analyse(req)).rejects.toThrow(
      "Invalid JSON",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws immediately when the response fails schema validation", async () => {
    const fetchMock = vi.fn().mockResolvedValue(messagesResponse({ not: "valid" }));
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
      .mockResolvedValueOnce(messagesResponse(validPayload));
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
      .mockResolvedValueOnce(messagesResponse(validPayload));
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
    it("fetches and maps the model list", async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        jsonResponse({
          data: [{ id: "claude-sonnet-4-20250514" }, { id: "claude-opus-4-20250514" }],
        }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const models = await provider().listModels();
      expect(models).toEqual([
        { id: "claude-sonnet-4-20250514" },
        { id: "claude-opus-4-20250514" },
      ]);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://example.com/v1/models",
        expect.objectContaining({
          headers: expect.objectContaining({ "x-api-key": "key" }) as unknown,
        }),
      );
    });
  });

  describe("pickDefaultAnthropicModel", () => {
    it("prefers a sonnet-4 model when present", () => {
      expect(
        pickDefaultAnthropicModel([
          { id: "claude-opus-4-20250514" },
          { id: "claude-sonnet-4-20250514" },
        ]),
      ).toBe("claude-sonnet-4-20250514");
    });

    it("falls back to any sonnet model", () => {
      expect(
        pickDefaultAnthropicModel([
          { id: "claude-3-5-sonnet-20241022" },
          { id: "claude-3-opus-20240229" },
        ]),
      ).toBe("claude-3-5-sonnet-20241022");
    });

    it("excludes legacy claude-1/instant models", () => {
      expect(
        pickDefaultAnthropicModel([
          { id: "claude-instant-1.2" },
          { id: "claude-1" },
          { id: "claude-3-opus-20240229" },
        ]),
      ).toBe("claude-3-opus-20240229");
    });

    it("returns null for an empty list", () => {
      expect(pickDefaultAnthropicModel([])).toBeNull();
    });
  });
});
