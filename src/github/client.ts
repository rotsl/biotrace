import * as fs from "node:fs";
import { getOctokit } from "@actions/github";
import type { GitHub } from "@actions/github/lib/utils";
export function createGitHubClient(token: string): InstanceType<typeof GitHub> {
  return getOctokit(token);
}
export function getRepoContext(): { owner: string; repo: string } {
  const r = process.env.GITHUB_REPOSITORY;
  if (!r) throw new Error("GITHUB_REPOSITORY not set");
  const [o, n] = r.split("/");
  return { owner: o!, repo: n! };
}
export function getPrNumber(): number | null {
  const ev = process.env.GITHUB_EVENT_NAME;
  if (ev !== "pull_request" && ev !== "pull_request_target") return null;
  try {
    const ep = process.env.GITHUB_EVENT_PATH;
    if (!ep) return null;
    const e = JSON.parse(fs.readFileSync(ep, "utf-8"));
    return e.pull_request?.number ?? null;
  } catch {
    return null;
  }
}
