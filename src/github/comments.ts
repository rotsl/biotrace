import * as core from "@actions/core";
import type { GitHub } from "@actions/github/lib/utils";
const MARKER = "<!-- biotrace-report -->";
export async function findExistingComment(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  prNum: number,
): Promise<number | null> {
  let page = 1;
  while (true) {
    const r = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNum,
      per_page: 100,
      page,
    });
    for (const c of r.data) if (c.body?.includes(MARKER)) return c.id;
    if (r.data.length < 100) break;
    page++;
  }
  return null;
}
export async function upsertComment(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  prNum: number,
  body: string,
  mode: string,
): Promise<void> {
  if (mode === "disabled") {
    core.info("Comments disabled");
    return;
  }
  const full = `${MARKER}\n${body}`;
  try {
    const eid = await findExistingComment(octokit, owner, repo, prNum);
    if (eid && mode === "update-existing") {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: eid,
        body: full,
      });
      core.info("Updated PR comment");
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNum,
        body: full,
      });
      core.info("Created PR comment");
    }
  } catch (err) {
    core.warning(`Comment failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
