import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseInputs } from "../../src/inputs";

const INPUT_KEYS = [
  "INPUT_CONFIG",
  "INPUT_GITHUB-TOKEN",
  "INPUT_FAIL-ON",
  "INPUT_CREATE-LABELS",
  "INPUT_COMMENT-MODE",
  "INPUT_REPORT-PATH",
  "INPUT_AI-ENABLED",
  "INPUT_AI-PROVIDER",
  "INPUT_AI-MODEL",
  "INPUT_AI-BASE-URL",
  "INPUT_AI-KEY-ENV",
];

function clearInputs(): void {
  for (const k of INPUT_KEYS) delete process.env[k];
}

describe("parseInputs", () => {
  beforeEach(clearInputs);
  afterEach(clearInputs);

  it("applies documented defaults when nothing is set", () => {
    const inputs = parseInputs();
    expect(inputs).toEqual({
      config: ".github/biotrace.yml",
      githubToken: "",
      failOn: "error",
      createLabels: true,
      commentMode: "update-existing",
      reportPath: "biotrace-report.json",
      aiEnabled: "auto",
      aiProvider: ["openai-compatible"],
      aiModel: "",
      aiBaseUrl: "",
      aiKeyEnv: "BIOTRACE_AI_API_KEY",
    });
  });

  it("reads provided values", () => {
    process.env["INPUT_CONFIG"] = "custom.yml";
    process.env["INPUT_GITHUB-TOKEN"] = "tok";
    process.env["INPUT_FAIL-ON"] = "warning";
    process.env["INPUT_CREATE-LABELS"] = "false";
    process.env["INPUT_COMMENT-MODE"] = "disabled";
    process.env["INPUT_REPORT-PATH"] = "out.json";
    process.env["INPUT_AI-ENABLED"] = "true";
    process.env["INPUT_AI-PROVIDER"] = "anthropic, gemini";
    process.env["INPUT_AI-MODEL"] = "gpt-4o-mini";
    process.env["INPUT_AI-BASE-URL"] = "https://example.com/v1";
    process.env["INPUT_AI-KEY-ENV"] = "MY_KEY";
    const inputs = parseInputs();
    expect(inputs.config).toBe("custom.yml");
    expect(inputs.githubToken).toBe("tok");
    expect(inputs.failOn).toBe("warning");
    expect(inputs.createLabels).toBe(false);
    expect(inputs.commentMode).toBe("disabled");
    expect(inputs.reportPath).toBe("out.json");
    expect(inputs.aiEnabled).toBe("true");
    expect(inputs.aiProvider).toEqual(["anthropic", "gemini"]);
    expect(inputs.aiModel).toBe("gpt-4o-mini");
    expect(inputs.aiBaseUrl).toBe("https://example.com/v1");
    expect(inputs.aiKeyEnv).toBe("MY_KEY");
  });

  it("rejects an invalid fail-on value", () => {
    process.env["INPUT_FAIL-ON"] = "critical";
    expect(() => parseInputs()).toThrow(/Invalid fail-on/);
  });

  it("rejects an invalid comment-mode value", () => {
    process.env["INPUT_COMMENT-MODE"] = "spam";
    expect(() => parseInputs()).toThrow(/Invalid comment-mode/);
  });

  it("rejects an invalid ai-enabled value", () => {
    process.env["INPUT_AI-ENABLED"] = "maybe";
    expect(() => parseInputs()).toThrow(/Invalid ai-enabled/);
  });

  it("rejects an unknown ai-provider value", () => {
    process.env["INPUT_AI-PROVIDER"] = "custom-provider";
    expect(() => parseInputs()).toThrow(/Invalid ai-provider/);
  });

  it("parses a comma-separated ai-provider priority list", () => {
    process.env["INPUT_AI-PROVIDER"] = "anthropic,openai-compatible";
    expect(parseInputs().aiProvider).toEqual(["anthropic", "openai-compatible"]);
  });
});
