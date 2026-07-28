# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 1.x     | ✅        |
| < 1.0   | ❌        |

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, use GitHub's private vulnerability reporting for this repository:

1. Go to the **Security** tab of the repository.
2. Click **Report a vulnerability**.
3. Describe the issue, affected versions, and (if possible) reproduction
   steps.

If private reporting is unavailable, open a
[draft security advisory](https://github.com/rotsl/biotrace/security/advisories/new)
directly.

You should expect an initial response within 5 business days. We'll work
with you to understand and validate the issue, agree on a disclosure
timeline, and credit you in the advisory unless you prefer to remain
anonymous.

## Scope

BioTrace is a GitHub Action that runs inside a repository's own CI. Things
we consider in scope:

- Path traversal or symlink escape allowing reads/writes outside the
  configured workspace (`src/security/paths.ts`, `src/utils/files.ts`).
- Secret/credential leakage — into the JSON report, PR comment, step
  summary, or an AI provider request (`src/security/redaction.ts`,
  `src/utils/patterns.ts`, `src/ai/sanitise.ts`).
- Any code path that executes untrusted repository content (BioTrace is
  designed to never execute analysis code, `.Rprofile`, shell profiles, or
  scripts from a pull request).
- Privilege escalation via a fork pull request (e.g. exfiltrating secrets
  that should be unavailable to `pull_request` from a fork).
- Denial of service against the Action itself via crafted input files
  (e.g. defeating the FASTA/FASTQ/CSV size and record limits in
  `src/security/limits.ts`).

Out of scope:

- Vulnerabilities in the consuming repository's own code, CI configuration,
  or third-party AI provider.
- Issues that require an attacker to already have write access to the
  repository or its secrets.

## Known limitations

- BioTrace does not claim any AI provider offers zero data retention;
  review your provider's data-handling policy independently before
  enabling `ai-enabled`.
- BioTrace checks traceability and configured evidence — it is not a
  substitute for scientific, statistical, ethical, or clinical review.

## Rotating a compromised secret

If `BIOTRACE_AI_API_KEY` (or any other secret) is accidentally exposed:

1. Revoke the key immediately at the provider's dashboard.
2. Generate a new key and update the repository secret
   (Settings → Secrets and variables → Actions).
3. Review recent workflow run logs for signs of misuse.
4. If the key was committed to git history, remove it with the BFG
   Repo-Cleaner or `git filter-branch`, then force-push the cleaned
   history.
