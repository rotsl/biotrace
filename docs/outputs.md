# Outputs & Inputs

## Action outputs

| Output                    | Description                             |
| ------------------------- | --------------------------------------- |
| `status`                  | `passed`, `warning`, or `error`         |
| `score`                   | Reproducibility score 0–100             |
| `report-path`             | Path to the JSON report                 |
| `findings-count`          | Total findings                          |
| `blocking-findings-count` | Findings at or above `fail-on` severity |

## Action inputs

| Input           | Default                | Description                                          |
| --------------- | ---------------------- | ---------------------------------------------------- |
| `config`        | `.github/biotrace.yml` | Path to configuration                                |
| `github-token`  | `${{ github.token }}`  | Token for PR/label/comment access                    |
| `fail-on`       | `error`                | Minimum severity to fail: `info`, `warning`, `error` |
| `create-labels` | `true`                 | Create missing labels                                |
| `comment-mode`  | `update-existing`      | `update-existing`, `create-new`, or `disabled`       |
| `report-path`   | `biotrace-report.json` | Output path for JSON report                          |
| `ai-enabled`    | `auto`                 | `auto`, `true`, or `false`                           |
| `ai-provider`   | `openai-compatible`    | AI provider adapter                                  |
| `ai-model`      | `""`                   | Model identifier (user provides)                     |
| `ai-base-url`   | `""`                   | Custom base URL for OpenAI-compatible API            |
| `ai-key-env`    | `BIOTRACE_AI_API_KEY`  | Environment variable name for API key                |
