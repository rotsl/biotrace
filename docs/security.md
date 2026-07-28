# Security & Privacy

## Security model

- **Never executes untrusted code** from pull requests
- **Never sources** `.Rprofile`, shell profiles, or repository scripts
- **Path traversal protection** — all paths validated against workspace
- **Symlink escape protection** — symlinks resolved and checked
- **Secret redaction** — tokens, keys, and passwords redacted before display or AI transmission
- **No `pull_request_target`** in recommended workflows
- **Fork PR safe** — deterministic checks run without secrets; AI is skipped when secrets are unavailable
- **Minimum permissions** — only `contents: read`, `pull-requests: write`, `issues: write`, `checks: write`

## Privacy model for AI

- Binary biological datasets (FASTQ, BAM, H5AD, RDS) are **never sent**
- Files matching `never_send` patterns are **excluded**
- Secrets and credentials are **redacted** before transmission
- Patch content is **truncated** to configured byte limits
- Only **changed file snippets** are included, not entire files
- AI observations are **advisory only** and **never override** deterministic checks
- AI **never marks** deterministic checks as passed
- AI **never alters** the reproducibility score
- If AI fails and `fail_open` is true, deterministic checks continue unaffected

## Fork pull-request behaviour

| Scenario                | Deterministic checks | AI                      | Labels              | Comments            |
| ----------------------- | -------------------- | ----------------------- | ------------------- | ------------------- |
| Same-repo PR            | ✅ Full              | ✅ If key available     | ✅                  | ✅                  |
| Fork PR                 | ✅ Full              | ❌ Skipped (no secrets) | ✅                  | ✅                  |
| Fork PR (no write perm) | ✅ Full              | ❌ Skipped              | ❌ Graceful warning | ❌ Graceful warning |

Found a security issue? See the repository's `SECURITY.md` for how to
report it privately.
