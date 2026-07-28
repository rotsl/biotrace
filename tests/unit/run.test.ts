import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import * as core from "@actions/core";
import type { ActionInputs } from "../../src/inputs";

const { fakeOctokit } = vi.hoisted(() => {
  const fakeOctokit = {
    rest: {
      pulls: { listFiles: vi.fn() },
      issues: {
        listComments: vi.fn(),
        createComment: vi.fn(),
        updateComment: vi.fn(),
        createLabel: vi.fn(),
        updateLabel: vi.fn(),
        addLabels: vi.fn(),
        removeLabel: vi.fn(),
      },
      repos: { get: vi.fn() },
    },
  };
  return { fakeOctokit };
});

vi.mock("@actions/github", () => ({
  getOctokit: () => fakeOctokit,
}));

function resetFakeOctokit(changedFiles: string[] = []): void {
  fakeOctokit.rest.pulls.listFiles.mockReset().mockResolvedValue({
    data: changedFiles.map((filename) => ({ filename })),
  });
  fakeOctokit.rest.issues.listComments.mockReset().mockResolvedValue({ data: [] });
  fakeOctokit.rest.issues.createComment.mockReset().mockResolvedValue({});
  fakeOctokit.rest.issues.updateComment.mockReset().mockResolvedValue({});
  fakeOctokit.rest.issues.createLabel.mockReset().mockResolvedValue({});
  fakeOctokit.rest.issues.updateLabel.mockReset().mockResolvedValue({});
  fakeOctokit.rest.issues.addLabels.mockReset().mockResolvedValue({});
  fakeOctokit.rest.issues.removeLabel.mockReset().mockResolvedValue({});
  fakeOctokit.rest.repos.get.mockReset().mockResolvedValue({
    data: { permissions: { push: true } },
  });
}

import { run } from "../../src/run";

const ENV_KEYS = [
  "GITHUB_WORKSPACE",
  "GITHUB_REPOSITORY",
  "GITHUB_EVENT_NAME",
  "GITHUB_EVENT_PATH",
  "GITHUB_STEP_SUMMARY",
  "GITHUB_SHA",
  "GITHUB_BASE_REF",
  "BIOTRACE_AI_API_KEY",
];
let saved: Record<string, string | undefined>;
let tmpDir: string;

function baseInputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    config: ".github/biotrace.yml",
    githubToken: "",
    failOn: "error",
    createLabels: true,
    commentMode: "update-existing",
    reportPath: "biotrace-report.json",
    aiEnabled: "auto",
    aiProvider: "openai-compatible",
    aiModel: "",
    aiBaseUrl: "",
    aiKeyEnv: "BIOTRACE_AI_API_KEY",
    ...overrides,
  };
}

function writeConfig(yaml: string): void {
  fs.mkdirSync(path.join(tmpDir, ".github"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, ".github", "biotrace.yml"), yaml);
}

function setPrEvent(number: number): void {
  const eventPath = path.join(tmpDir, "event.json");
  fs.writeFileSync(eventPath, JSON.stringify({ pull_request: { number } }));
  process.env.GITHUB_EVENT_NAME = "pull_request";
  process.env.GITHUB_EVENT_PATH = eventPath;
}

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) saved[k] = process.env[k];
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bt-run-"));
  process.env.GITHUB_WORKSPACE = tmpDir;
  process.env.GITHUB_REPOSITORY = "rotsl/biotrace";
  process.env.GITHUB_STEP_SUMMARY = path.join(tmpDir, "step-summary.md");
  fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, "");
  process.env.GITHUB_SHA = "headsha";
  process.env.GITHUB_BASE_REF = "main";
  delete process.env.GITHUB_EVENT_NAME;
  delete process.env.GITHUB_EVENT_PATH;
  delete process.env.BIOTRACE_AI_API_KEY;
  resetFakeOctokit();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("run() — deterministic only (no GitHub token)", () => {
  it("validates metadata, writes a report, and reports passed status", async () => {
    writeConfig(
      [
        "version: 1",
        "files:",
        "  metadata:",
        "    - path: data/sample_metadata.csv",
        "      required_columns: [sample_id, condition]",
        "      unique: [sample_id]",
      ].join("\n"),
    );
    fs.mkdirSync(path.join(tmpDir, "data"));
    fs.writeFileSync(
      path.join(tmpDir, "data", "sample_metadata.csv"),
      "sample_id,condition\nS1,control\nS2,treatment\n",
    );
    const setOutputSpy = vi.spyOn(core, "setOutput").mockImplementation(() => {});
    const setFailedSpy = vi.spyOn(core, "setFailed").mockImplementation(() => {});

    const report = await run(baseInputs({ aiEnabled: "false" }));

    expect(report.status).toBe("passed");
    expect(report.summary.files_checked).toBe(1);
    expect(report.ai.status).toBe("disabled");
    expect(fakeOctokit.rest.issues.createLabel).not.toHaveBeenCalled();
    expect(setFailedSpy).not.toHaveBeenCalled();
    expect(setOutputSpy).toHaveBeenCalledWith("status", "passed");

    const written = JSON.parse(
      fs.readFileSync(path.join(tmpDir, "biotrace-report.json"), "utf-8"),
    );
    expect(written.status).toBe("passed");

    setOutputSpy.mockRestore();
    setFailedSpy.mockRestore();
  });

  it("fails the run when a blocking finding is present", async () => {
    writeConfig(
      [
        "version: 1",
        "files:",
        "  metadata:",
        "    - path: data/sample_metadata.csv",
        "      unique: [sample_id]",
      ].join("\n"),
    );
    fs.mkdirSync(path.join(tmpDir, "data"));
    fs.writeFileSync(
      path.join(tmpDir, "data", "sample_metadata.csv"),
      "sample_id,condition\nS1,control\nS1,treatment\n",
    );
    const setFailedSpy = vi.spyOn(core, "setFailed").mockImplementation(() => {});

    const report = await run(baseInputs({ aiEnabled: "false" }));

    expect(report.status).toBe("error");
    expect(report.summary.blocking_findings).toBeGreaterThan(0);
    expect(setFailedSpy).toHaveBeenCalledWith(
      expect.stringContaining("blocking finding"),
    );

    setFailedSpy.mockRestore();
  });

  it("propagates a configuration error and calls setFailed", async () => {
    writeConfig("version: 2\n");
    const setFailedSpy = vi.spyOn(core, "setFailed").mockImplementation(() => {});
    await expect(run(baseInputs({ aiEnabled: "false" }))).rejects.toThrow();
    expect(setFailedSpy).toHaveBeenCalled();
    setFailedSpy.mockRestore();
  });
});

describe("run() — with GitHub integration", () => {
  it("creates labels and posts a PR comment when write access is available", async () => {
    writeConfig(
      [
        "version: 1",
        "files:",
        "  metadata:",
        "    - path: data/sample_metadata.csv",
        "      required_columns: [sample_id]",
      ].join("\n"),
    );
    fs.mkdirSync(path.join(tmpDir, "data"));
    fs.writeFileSync(path.join(tmpDir, "data", "sample_metadata.csv"), "sample_id\nS1\n");
    setPrEvent(9);

    const report = await run(baseInputs({ githubToken: "tok", aiEnabled: "false" }));

    expect(report.pull_request).toEqual({
      number: 9,
      base_sha: "main",
      head_sha: "headsha",
    });
    expect(fakeOctokit.rest.pulls.listFiles).toHaveBeenCalled();
    expect(fakeOctokit.rest.issues.createLabel).toHaveBeenCalled();
    expect(fakeOctokit.rest.issues.addLabels).toHaveBeenCalled();
    expect(fakeOctokit.rest.issues.createComment).toHaveBeenCalled();
  });

  it("degrades gracefully without labels/comments when write access is unavailable", async () => {
    writeConfig(["version: 1"].join("\n"));
    setPrEvent(3);
    fakeOctokit.rest.repos.get.mockResolvedValue({
      data: { permissions: { push: false } },
    });

    await run(baseInputs({ githubToken: "tok", aiEnabled: "false" }));

    expect(fakeOctokit.rest.issues.createLabel).not.toHaveBeenCalled();
    expect(fakeOctokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("skips label creation when create-labels is false", async () => {
    writeConfig(["version: 1"].join("\n"));
    setPrEvent(4);

    await run(
      baseInputs({ githubToken: "tok", aiEnabled: "false", createLabels: false }),
    );

    expect(fakeOctokit.rest.issues.createLabel).not.toHaveBeenCalled();
    expect(fakeOctokit.rest.issues.createComment).toHaveBeenCalled();
  });
});

describe("run() — AI integration", () => {
  it("reports no-key when AI is requested but no API key is configured", async () => {
    writeConfig(["version: 1"].join("\n"));
    setPrEvent(1);

    const report = await run(
      baseInputs({ githubToken: "tok", aiEnabled: "true", aiModel: "gpt-4o-mini" }),
    );

    expect(report.ai.status).toBe("no-key");
    expect(report.ai.enabled).toBe(false);
  });

  it("completes AI analysis and filters observations by minimum_confidence", async () => {
    writeConfig(["version: 1", "ai:", "  minimum_confidence: 0.5"].join("\n"));
    setPrEvent(2);
    process.env.BIOTRACE_AI_API_KEY = "sk-test";

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "s",
                observations: [
                  {
                    title: "high",
                    message: "m",
                    confidence: 0.9,
                    paths: [],
                    requires_human_verification: true,
                  },
                  {
                    title: "low",
                    message: "m",
                    confidence: 0.1,
                    paths: [],
                    requires_human_verification: true,
                  },
                ],
                candidate_claims: [],
                reviewer_checklist: [],
              }),
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const report = await run(
      baseInputs({ githubToken: "tok", aiEnabled: "true", aiModel: "gpt-4o-mini" }),
    );

    expect(report.ai.status).toBe("completed");
    expect(report.ai.enabled).toBe(true);
    expect(report.ai.observations).toHaveLength(1);
    expect(report.ai.observations?.[0]?.title).toBe("high");
  });

  it("marks AI as failed but keeps the run non-blocking when fail_open is true", async () => {
    writeConfig(["version: 1"].join("\n"));
    setPrEvent(5);
    process.env.BIOTRACE_AI_API_KEY = "sk-test";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) }),
    );

    const report = await run(
      baseInputs({ githubToken: "tok", aiEnabled: "true", aiModel: "gpt-4o-mini" }),
    );

    expect(report.ai.status).toBe("failed");
    expect(report.status).not.toBe("error");
  });

  it("does not request AI when ai-enabled is false", async () => {
    writeConfig(["version: 1"].join("\n"));
    setPrEvent(6);
    process.env.BIOTRACE_AI_API_KEY = "sk-test";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const report = await run(baseInputs({ githubToken: "tok", aiEnabled: "false" }));

    expect(report.ai.status).toBe("disabled");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
