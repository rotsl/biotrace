import { describe, it, expect, vi } from "vitest";
import * as core from "@actions/core";
import {
  ensureLabelsExist,
  applyLabels,
  removeLabels,
  manageExclusiveLabels,
  REQUIRED_LABELS,
  EXCLUSIVE_GROUPS,
} from "../../src/github/labels";

vi.mock("@actions/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@actions/core")>();
  return { ...actual, warning: vi.fn() };
});

function fakeOctokit(overrides: Partial<Record<string, any>> = {}): any {
  return {
    rest: {
      issues: {
        createLabel: vi.fn().mockResolvedValue({}),
        updateLabel: vi.fn().mockResolvedValue({}),
        addLabels: vi.fn().mockResolvedValue({}),
        removeLabel: vi.fn().mockResolvedValue({}),
        ...overrides,
      },
    },
  };
}

describe("ensureLabelsExist", () => {
  it("skips entirely when create is false", async () => {
    const octokit = fakeOctokit();
    const result = await ensureLabelsExist(octokit, "o", "r", "", {}, false);
    expect(result).toEqual({ success: true, warning: "Label creation disabled" });
    expect(octokit.rest.issues.createLabel).not.toHaveBeenCalled();
  });

  it("creates every required label with its default colour", async () => {
    const octokit = fakeOctokit();
    const result = await ensureLabelsExist(octokit, "o", "r", "", {}, true);
    expect(result).toEqual({ success: true });
    expect(octokit.rest.issues.createLabel).toHaveBeenCalledTimes(REQUIRED_LABELS.length);
    const passedCall = octokit.rest.issues.createLabel.mock.calls.find(
      (c: any[]) => c[0].name === "biotrace:passed",
    );
    expect(passedCall[0].color).toBe("1f883d");
  });

  it("prefixes label names when a prefix is configured", async () => {
    const octokit = fakeOctokit();
    await ensureLabelsExist(octokit, "o", "r", "bt-", {}, true);
    expect(octokit.rest.issues.createLabel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "bt-biotrace:passed" }),
    );
  });

  it("applies a category colour override to every label in that category", async () => {
    const octokit = fakeOctokit();
    await ensureLabelsExist(octokit, "o", "r", "", { passed: "00ff00" }, true);
    const passedCall = octokit.rest.issues.createLabel.mock.calls.find(
      (c: any[]) => c[0].name === "biotrace:passed",
    );
    const dataValidCall = octokit.rest.issues.createLabel.mock.calls.find(
      (c: any[]) => c[0].name === "data:valid",
    );
    expect(passedCall[0].color).toBe("00ff00");
    expect(dataValidCall[0].color).toBe("00ff00");
    const warningCall = octokit.rest.issues.createLabel.mock.calls.find(
      (c: any[]) => c[0].name === "biotrace:warning",
    );
    expect(warningCall[0].color).toBe("bf8700");
  });

  it("falls back to updateLabel when createLabel reports a 422 conflict", async () => {
    const err = Object.assign(new Error("already exists"), { status: 422 });
    const octokit = fakeOctokit({ createLabel: vi.fn().mockRejectedValue(err) });
    const result = await ensureLabelsExist(octokit, "o", "r", "", {}, true);
    expect(result).toEqual({ success: true });
    expect(octokit.rest.issues.updateLabel).toHaveBeenCalledTimes(REQUIRED_LABELS.length);
  });

  it("reports failure when createLabel fails for a non-conflict reason", async () => {
    vi.mocked(core.warning).mockClear();
    const octokit = fakeOctokit({
      createLabel: vi.fn().mockRejectedValue(new Error("network error")),
    });
    const result = await ensureLabelsExist(octokit, "o", "r", "", {}, true);
    expect(result).toEqual({ success: false, warning: "Some labels failed" });
  });
});

describe("applyLabels", () => {
  it("adds prefixed labels", async () => {
    const octokit = fakeOctokit();
    await applyLabels(octokit, "o", "r", 1, ["biotrace:passed"], "bt-");
    expect(octokit.rest.issues.addLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ["bt-biotrace:passed"] }),
    );
  });

  it("does not throw when the API call fails", async () => {
    const octokit = fakeOctokit({
      addLabels: vi.fn().mockRejectedValue(new Error("boom")),
    });
    await expect(applyLabels(octokit, "o", "r", 1, ["x"], "")).resolves.toBeUndefined();
  });
});

describe("removeLabels", () => {
  it("removes each label and swallows per-label errors", async () => {
    const octokit = fakeOctokit({
      removeLabel: vi
        .fn()
        .mockRejectedValueOnce(new Error("not found"))
        .mockResolvedValue({}),
    });
    await expect(
      removeLabels(octokit, "o", "r", 1, ["a", "b"], ""),
    ).resolves.toBeUndefined();
    expect(octokit.rest.issues.removeLabel).toHaveBeenCalledTimes(2);
  });
});

describe("manageExclusiveLabels", () => {
  it("removes every other member of the group but not the active label", async () => {
    const octokit = fakeOctokit();
    const group = EXCLUSIVE_GROUPS[0]!;
    await manageExclusiveLabels(octokit, "o", "r", 1, "biotrace:passed", group, "");
    expect(octokit.rest.issues.removeLabel).toHaveBeenCalledTimes(group.length - 1);
    const removedNames = octokit.rest.issues.removeLabel.mock.calls.map(
      (c: any[]) => c[0].name,
    );
    expect(removedNames).not.toContain("biotrace:passed");
  });
});
