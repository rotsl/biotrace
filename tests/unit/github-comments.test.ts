import { describe, it, expect, vi } from "vitest";
import { findExistingComment, upsertComment } from "../../src/github/comments";

const MARKER = "<!-- biotrace-report -->";

function fakeOctokit(existing: { id: number; body: string }[] = []): any {
  return {
    rest: {
      issues: {
        listComments: vi.fn().mockResolvedValue({ data: existing }),
        updateComment: vi.fn().mockResolvedValue({}),
        createComment: vi.fn().mockResolvedValue({}),
      },
    },
  };
}

describe("findExistingComment", () => {
  it("returns null when no comment has the marker", async () => {
    const octokit = fakeOctokit([{ id: 1, body: "unrelated" }]);
    expect(await findExistingComment(octokit, "o", "r", 1)).toBeNull();
  });
  it("returns the id of the marked comment", async () => {
    const octokit = fakeOctokit([
      { id: 1, body: "unrelated" },
      { id: 2, body: `${MARKER}\nreport` },
    ]);
    expect(await findExistingComment(octokit, "o", "r", 1)).toBe(2);
  });
});

describe("upsertComment", () => {
  it("does nothing when mode is disabled", async () => {
    const octokit = fakeOctokit();
    await upsertComment(octokit, "o", "r", 1, "body", "disabled");
    expect(octokit.rest.issues.listComments).not.toHaveBeenCalled();
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("creates a comment when none exists", async () => {
    const octokit = fakeOctokit([]);
    await upsertComment(octokit, "o", "r", 1, "body", "update-existing");
    expect(octokit.rest.issues.createComment).toHaveBeenCalledWith(
      expect.objectContaining({ owner: "o", repo: "r", issue_number: 1 }),
    );
    expect(octokit.rest.issues.updateComment).not.toHaveBeenCalled();
  });

  it("updates the existing comment in update-existing mode", async () => {
    const octokit = fakeOctokit([{ id: 5, body: `${MARKER}\nold` }]);
    await upsertComment(octokit, "o", "r", 1, "new body", "update-existing");
    expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 5 }),
    );
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it("creates a new comment even when one exists in create-new mode", async () => {
    const octokit = fakeOctokit([{ id: 5, body: `${MARKER}\nold` }]);
    await upsertComment(octokit, "o", "r", 1, "new body", "create-new");
    expect(octokit.rest.issues.createComment).toHaveBeenCalledTimes(1);
    expect(octokit.rest.issues.updateComment).not.toHaveBeenCalled();
  });

  it("does not throw when the API call fails", async () => {
    const octokit = fakeOctokit([]);
    octokit.rest.issues.createComment.mockRejectedValue(new Error("boom"));
    await expect(
      upsertComment(octokit, "o", "r", 1, "body", "update-existing"),
    ).resolves.toBeUndefined();
  });
});
