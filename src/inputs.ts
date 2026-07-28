import * as core from "@actions/core";
export interface ActionInputs {
  config: string;
  githubToken: string;
  failOn: "info" | "warning" | "error";
  createLabels: boolean;
  commentMode: "update-existing" | "create-new" | "disabled";
  reportPath: string;
  aiEnabled: "auto" | "true" | "false";
  aiProvider: string;
  aiModel: string;
  aiBaseUrl: string;
  aiKeyEnv: string;
}
export function parseInputs(): ActionInputs {
  const rf = core.getInput("fail-on") || "error";
  if (!["info", "warning", "error"].includes(rf))
    throw new Error(`Invalid fail-on: "${rf}"`);
  const rc = core.getInput("comment-mode") || "update-existing";
  if (!["update-existing", "create-new", "disabled"].includes(rc))
    throw new Error(`Invalid comment-mode: "${rc}"`);
  const ra = core.getInput("ai-enabled") || "auto";
  if (!["auto", "true", "false"].includes(ra))
    throw new Error(`Invalid ai-enabled: "${ra}"`);
  return {
    config: core.getInput("config") || ".github/biotrace.yml",
    githubToken: core.getInput("github-token") || "",
    failOn: rf as ActionInputs["failOn"],
    createLabels: (core.getInput("create-labels") || "true") === "true",
    commentMode: rc as ActionInputs["commentMode"],
    reportPath: core.getInput("report-path") || "biotrace-report.json",
    aiEnabled: ra as ActionInputs["aiEnabled"],
    aiProvider: core.getInput("ai-provider") || "openai-compatible",
    aiModel: core.getInput("ai-model") || "",
    aiBaseUrl: core.getInput("ai-base-url") || "",
    aiKeyEnv: core.getInput("ai-key-env") || "BIOTRACE_AI_API_KEY",
  };
}
