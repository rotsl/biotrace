import { describe, it, expect, vi } from "vitest";
import { checkWritePermissions } from "../../src/github/permissions";

describe("checkWritePermissions", () => {
  it("returns write access when the repo reports push permission", async () => {
    const octokit: any = {
      rest: {
        repos: {
          get: vi.fn().mockResolvedValue({ data: { permissions: { push: true } } }),
        },
      },
    };
    expect(await checkWritePermissions(octokit, "o", "r")).toEqual({
      canWriteLabels: true,
      canWriteComments: true,
    });
  });

  it("returns no write access when push permission is false", async () => {
    const octokit: any = {
      rest: {
        repos: {
          get: vi.fn().mockResolvedValue({ data: { permissions: { push: false } } }),
        },
      },
    };
    expect(await checkWritePermissions(octokit, "o", "r")).toEqual({
      canWriteLabels: false,
      canWriteComments: false,
    });
  });

  it("returns no write access when permissions are missing", async () => {
    const octokit: any = {
      rest: { repos: { get: vi.fn().mockResolvedValue({ data: {} }) } },
    };
    expect(await checkWritePermissions(octokit, "o", "r")).toEqual({
      canWriteLabels: false,
      canWriteComments: false,
    });
  });

  it("assumes write access when the API call fails", async () => {
    const octokit: any = {
      rest: { repos: { get: vi.fn().mockRejectedValue(new Error("boom")) } },
    };
    expect(await checkWritePermissions(octokit, "o", "r")).toEqual({
      canWriteLabels: true,
      canWriteComments: true,
    });
  });
});
