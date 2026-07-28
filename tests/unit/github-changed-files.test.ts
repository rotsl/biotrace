import { describe, it, expect, vi } from "vitest";
import { getChangedFiles } from "../../src/github/changed-files";

function fakeOctokit(pages: string[][]): any {
  let call = 0;
  return {
    rest: {
      pulls: {
        listFiles: vi.fn().mockImplementation(() => {
          const page = pages[call] ?? [];
          call++;
          return Promise.resolve({ data: page.map((filename) => ({ filename })) });
        }),
      },
    },
  };
}

describe("getChangedFiles", () => {
  it("returns filenames from a single page", async () => {
    const octokit = fakeOctokit([["a.csv", "b.fa"]]);
    const files = await getChangedFiles(octokit, "owner", "repo", 1);
    expect(files).toEqual(["a.csv", "b.fa"]);
    expect(octokit.rest.pulls.listFiles).toHaveBeenCalledTimes(1);
  });

  it("paginates when a page is full", async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => `f${i}.csv`);
    const octokit = fakeOctokit([fullPage, ["last.csv"]]);
    const files = await getChangedFiles(octokit, "owner", "repo", 1);
    expect(files.length).toBe(101);
    expect(files[100]).toBe("last.csv");
    expect(octokit.rest.pulls.listFiles).toHaveBeenCalledTimes(2);
  });

  it("returns an empty array when there are no files", async () => {
    const octokit = fakeOctokit([[]]);
    const files = await getChangedFiles(octokit, "owner", "repo", 1);
    expect(files).toEqual([]);
  });
});
