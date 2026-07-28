import type { GitHub } from "@actions/github/lib/utils";
export async function getChangedFiles(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  prNum: number,
): Promise<string[]> {
  const files: string[] = [];
  let page = 1;
  while (true) {
    const r = await octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: prNum,
      per_page: 100,
      page,
    });
    for (const f of r.data) files.push(f.filename);
    if (r.data.length < 100) break;
    page++;
  }
  return files;
}
