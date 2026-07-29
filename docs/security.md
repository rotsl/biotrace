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
- With multiple providers configured, sanitised content is sent only to whichever provider
  ends up handling the request — never to more than one

## API keys for multiple providers

The primary (first) provider's key comes from the environment variable named by the `ai-key-env`
input (default `BIOTRACE_AI_API_KEY`). Providers listed after the first are looked up via fixed
conventional environment variable names — `BIOTRACE_OPENAI_API_KEY`, `BIOTRACE_ANTHROPIC_API_KEY`,
`BIOTRACE_GEMINI_API_KEY` — rather than additional `action.yml` inputs. Set these in the
workflow's `env:` block, sourced from repository or organization secrets (`secrets.*`) so GitHub
masks them in logs the same way it does for `BIOTRACE_AI_API_KEY` today.

## Fork pull-request behaviour

| Scenario                | Deterministic checks | AI                      | Labels              | Comments            |
| ----------------------- | -------------------- | ----------------------- | ------------------- | ------------------- |
| Same-repo PR            | ✅ Full              | ✅ If any configured provider has a key | ✅                  | ✅                  |
| Fork PR                 | ✅ Full              | ❌ Skipped (no secrets) | ✅                  | ✅                  |
| Fork PR (no write perm) | ✅ Full              | ❌ Skipped              | ❌ Graceful warning | ❌ Graceful warning |

Found a security issue? See the repository's `SECURITY.md` for how to
report it privately.
