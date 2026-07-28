import * as core from "@actions/core";
import type { GitHub } from "@actions/github/lib/utils";
export async function checkWritePermissions(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
): Promise<{ canWriteLabels: boolean; canWriteComments: boolean }> {
  try {
    const { data } = await octokit.rest.repos.get({ owner, repo });
    const canWrite = data.permissions?.push ?? false;
    return { canWriteLabels: canWrite, canWriteComments: canWrite };
  } catch {
    core.info("Cannot determine permissions; assuming write.");
    return { canWriteLabels: true, canWriteComments: true };
  }
}
