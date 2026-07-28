import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createGitHubClient, getRepoContext, getPrNumber } from "../../src/github/client";

const ENV_KEYS = ["GITHUB_REPOSITORY", "GITHUB_EVENT_NAME", "GITHUB_EVENT_PATH"];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of ENV_KEYS) saved[k] = process.env[k];
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("createGitHubClient", () => {
  it("returns an octokit instance", () => {
    const client = createGitHubClient("fake-token");
    expect(client.rest.pulls.listFiles).toBeTypeOf("function");
  });
});

describe("getRepoContext", () => {
  it("splits owner/repo from GITHUB_REPOSITORY", () => {
    process.env.GITHUB_REPOSITORY = "rotsl/biotrace";
    expect(getRepoContext()).toEqual({ owner: "rotsl", repo: "biotrace" });
  });
  it("throws when GITHUB_REPOSITORY is unset", () => {
    delete process.env.GITHUB_REPOSITORY;
    expect(() => getRepoContext()).toThrow("GITHUB_REPOSITORY not set");
  });
});

describe("getPrNumber", () => {
  it("returns null when the event isn't a pull_request", () => {
    process.env.GITHUB_EVENT_NAME = "push";
    expect(getPrNumber()).toBeNull();
  });
  it("returns null when GITHUB_EVENT_PATH is unset", () => {
    process.env.GITHUB_EVENT_NAME = "pull_request";
    delete process.env.GITHUB_EVENT_PATH;
    expect(getPrNumber()).toBeNull();
  });
  it("reads the PR number from the event payload", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bt-event-"));
    const eventPath = path.join(tmp, "event.json");
    fs.writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 42 } }));
    process.env.GITHUB_EVENT_NAME = "pull_request";
    process.env.GITHUB_EVENT_PATH = eventPath;
    expect(getPrNumber()).toBe(42);
  });
  it("accepts pull_request_target events", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bt-event-"));
    const eventPath = path.join(tmp, "event.json");
    fs.writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 7 } }));
    process.env.GITHUB_EVENT_NAME = "pull_request_target";
    process.env.GITHUB_EVENT_PATH = eventPath;
    expect(getPrNumber()).toBe(7);
  });
  it("returns null on malformed event payload", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bt-event-"));
    const eventPath = path.join(tmp, "event.json");
    fs.writeFileSync(eventPath, "not json");
    process.env.GITHUB_EVENT_NAME = "pull_request";
    process.env.GITHUB_EVENT_PATH = eventPath;
    expect(getPrNumber()).toBeNull();
  });
});
