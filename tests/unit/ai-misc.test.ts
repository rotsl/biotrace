import { describe, it, expect } from "vitest";
import { NoOpAIProvider, AIProviderError } from "../../src/ai/provider";
import { validateAIResponse } from "../../src/ai/schema";
import { buildPrompt } from "../../src/ai/prompts";
import type { AIAnalysisRequest } from "../../src/ai/types";

describe("NoOpAIProvider", () => {
  it("returns an empty, valid response", async () => {
    const result = await new NoOpAIProvider().analyse({
      changedFiles: [],
      patchContent: "",
      configSummary: "{}",
      findings: [],
      tasks: [],
    });
    expect(result).toEqual({
      summary: "",
      observations: [],
      candidate_claims: [],
      reviewer_checklist: [],
    });
  });
});

describe("AIProviderError", () => {
  it("defaults to non-retryable", () => {
    const err = new AIProviderError("boom");
    expect(err.retryable).toBe(false);
    expect(err.name).toBe("AIProviderError");
  });
  it("carries a retryable flag", () => {
    expect(new AIProviderError("boom", true).retryable).toBe(true);
  });
});

describe("validateAIResponse", () => {
  it("accepts a well-formed response", () => {
    const valid = {
      summary: "s",
      observations: [
        {
          title: "t",
          message: "m",
          confidence: 0.9,
          paths: ["a.R"],
          requires_human_verification: true,
        },
      ],
      candidate_claims: [],
      reviewer_checklist: ["check x"],
    };
    expect(validateAIResponse(valid)).toEqual(valid);
  });

  it("rejects malformed input", () => {
    expect(validateAIResponse({ not: "valid" })).toBeNull();
  });

  it("rejects an observation with requires_human_verification: false", () => {
    const invalid = {
      summary: "s",
      observations: [
        {
          title: "t",
          message: "m",
          confidence: 0.9,
          paths: [],
          requires_human_verification: false,
        },
      ],
      candidate_claims: [],
      reviewer_checklist: [],
    };
    expect(validateAIResponse(invalid)).toBeNull();
  });
});

describe("buildPrompt", () => {
  it("includes tasks, changed files, patch, findings, and config", () => {
    const req: AIAnalysisRequest = {
      changedFiles: ["a.R", "b.csv"],
      patchContent: "diff --git a/a.R b/a.R",
      configSummary: '{"version":1}',
      findings: [{ title: "T", message: "M", severity: "warning" }],
      tasks: ["pr_summary", "method_drift"],
    };
    const prompt = buildPrompt(req);
    expect(prompt).toContain("Summarize the scientific purpose");
    expect(prompt).toContain("- a.R");
    expect(prompt).toContain("- b.csv");
    expect(prompt).toContain("diff --git a/a.R b/a.R");
    expect(prompt).toContain("[warning] T: M");
    expect(prompt).toContain('{"version":1}');
    expect(prompt).toContain("requires_human_verification=true");
  });

  it("falls back to the raw task name for unknown tasks", () => {
    const req: AIAnalysisRequest = {
      changedFiles: [],
      patchContent: "",
      configSummary: "{}",
      findings: [],
      tasks: ["some_future_task"],
    };
    expect(buildPrompt(req)).toContain("1. some_future_task");
  });
});
