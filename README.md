<p align="center">
  <img src="https://img.shields.io/badge/BioTrace-v1.0.3-green" alt="BioTrace version" />
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License" />
  <img src="https://img.shields.io/badge/Node.js-22%2B-339933" alt="Node.js 22+" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6" alt="TypeScript strict" />
  <br/>
  <a href="https://github.com/rotsl/biotrace/actions/workflows/ci.yml"><img src="https://github.com/rotsl/biotrace/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="https://github.com/rotsl/biotrace/actions/workflows/codeql.yml"><img src="https://github.com/rotsl/biotrace/actions/workflows/codeql.yml/badge.svg" alt="CodeQL status" /></a>
  <a href="https://rotsl.github.io/biotrace/"><img src="https://img.shields.io/badge/docs-live-blue" alt="Documentation" /></a>
</p>

# BioTrace

**Trace biological results from data and code to figures and scientific claims.**

BioTrace is a GitHub Action for computational-biology repositories that checks whether scientific artefacts remain traceable across the entire analysis chain:

```
Input data → Biological metadata → Analysis code → Statistical results → Figures and tables → Written scientific claims
```

---

## ⚠️ Disclaimer

**BioTrace checks traceability and configured evidence. It does not establish biological truth. It does not replace scientific, statistical, ethical, clinical, or peer review.**

---

## Why BioTrace?

Consider this common scenario:

```
Analysis changed. ✏️
Result table changed. ✏️
Figure did not change. ❌
Manuscript still contains the old result. ❌
```

BioTrace detects this class of problems automatically, on every pull request, before reviewers spend time on stale results.

---

## Features

| Feature                      | Description                                                              |
| ---------------------------- | ------------------------------------------------------------------------ |
| **Metadata validation**      | CSV/TSV column checks, uniqueness, allowed values, minimum group sizes   |
| **FASTA validation**         | Streaming validation, alphabet checks, duplicate IDs, length limits      |
| **FASTQ validation**         | 4-line record structure, quality-length matching, truncation detection   |
| **Lineage tracing**          | Detects stale outputs, untraceable results, outdated claims              |
| **Numerical claims**         | Verify manuscript claims against CSV/TSV evidence files                  |
| **Figure provenance**        | Sidecar `.biotrace.json` provenance with hash verification               |
| **Reproducibility score**    | Transparent weighted scoring (0–100)                                     |
| **PR labels**                | Auto-managed, namespaced, exclusive-group labels                         |
| **Persistent comment**       | One updated PR comment, never spammed                                    |
| **AI-assisted observations** | Optional, bring-your-own-key, advisory only                              |
| **Security**                 | Path traversal protection, secret redaction, no untrusted code execution |

---

## Documentation

Full user-facing documentation is published at
**[rotsl.github.io/biotrace](https://rotsl.github.io/biotrace/)**: Quick
Start, Configuration Reference, Labels Reference, Outputs & Inputs,
Security & Privacy, and Troubleshooting. This README covers the same
ground for anyone browsing the repository directly. The docs site is
built with [MkDocs](https://www.mkdocs.org/) from the `docs/` directory
and deploys via the manually-triggered "Deploy docs" workflow (see
[CONTRIBUTING.md](CONTRIBUTING.md)).

---

## 10-Minute Quick Start

### 1. Create the configuration file

Create `.github/biotrace.yml` in your repository:

```yaml
version: 1
files:
  metadata:
    - path: data/sample_metadata.csv
      required_columns:
        - sample_id
        - condition
      unique:
        - sample_id
      allowed_values:
        condition:
          - control
          - treatment
```

### 2. Add the workflow

Create `.github/workflows/biotrace.yml`:

```yaml
name: BioTrace
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
permissions:
  contents: read
  pull-requests: write
  issues: write
  checks: write
jobs:
  biotrace:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - id: biotrace
        uses: rotsl/biotrace@v1
        with:
          config: .github/biotrace.yml
          github-token: ${{ github.token }}
          fail-on: error
          ai-enabled: "false"
      - if: always()
        uses: actions/upload-artifact@v7
        with:
          name: biotrace-report
          path: ${{ steps.biotrace.outputs.report-path }}
```

### 3. Open a pull request

BioTrace runs automatically and posts a report comment on your PR.

---

## No-AI Example

The simplest configuration. No API keys, no AI, fully deterministic:

```yaml
name: BioTrace
on: pull_request
permissions:
  contents: read
  pull-requests: write
  issues: write
jobs:
  biotrace:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: rotsl/biotrace@v1
        with:
          config: .github/biotrace.yml
          ai-enabled: "false"
```

---

## Optional AI Example

Bring-your-own-key. AI observations are advisory only and never override deterministic checks:

```yaml
name: BioTrace
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]
permissions:
  contents: read
  pull-requests: write
  issues: write
  checks: write
jobs:
  biotrace:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - id: biotrace
        uses: rotsl/biotrace@v1
        with:
          config: .github/biotrace.yml
          github-token: ${{ github.token }}
          ai-enabled: auto
          ai-provider: openai-compatible
          ai-model: ${{ vars.BIOTRACE_AI_MODEL }}
        env:
          BIOTRACE_AI_API_KEY: ${{ secrets.BIOTRACE_AI_API_KEY }}
      - if: always()
        uses: actions/upload-artifact@v7
        with:
          name: biotrace-report
          path: ${{ steps.biotrace.outputs.report-path }}
```

---

## Configuration Reference

### Top-level fields

| Field             | Type    | Required | Default      | Description                             |
| ----------------- | ------- | -------- | ------------ | --------------------------------------- |
| `version`         | integer | ✅       | —            | Must be `1`                             |
| `repository`      | object  | ❌       | —            | Languages, organisms, analysis types    |
| `files`           | object  | ❌       | `{}`         | Metadata, FASTA, FASTQ file definitions |
| `lineage`         | array   | ❌       | `[]`         | Data-to-claim lineage definitions       |
| `reproducibility` | object  | ❌       | see defaults | Scoring weights and requirements        |
| `claims`          | array   | ❌       | `[]`         | Numerical claim definitions             |
| `figures`         | array   | ❌       | `[]`         | Figure provenance definitions           |
| `labels`          | object  | ❌       | see defaults | Label creation and colours              |
| `comment`         | object  | ❌       | see defaults | PR comment behaviour                    |
| `ai`              | object  | ❌       | see defaults | AI provider configuration               |

### Metadata file

```yaml
files:
  metadata:
    - path: data/sample_metadata.csv
      delimiter: auto # auto | "," | "\t" | ";"
      id_column: sample_id
      required_columns: [sample_id, condition, biological_replicate]
      non_null: [sample_id, condition]
      unique: [sample_id]
      allowed_values:
        condition: [control, treatment]
      minimum_group_size:
        group_by: condition
        value: 3
        severity: warning # info | warning | error
```

### FASTA file

```yaml
files:
  fasta:
    - glob: "references/**/*.fa"
      alphabet: dna # dna | rna | protein | unrestricted
      unique_ids: true
      reject_empty_sequences: true
      minimum_length: 50
      maximum_length: 1000000
```

### FASTQ file

```yaml
files:
  fastq:
    - glob: "data/**/*.fq"
      alphabet: dna
      unique_ids: false
      reject_empty_sequences: true
      maximum_records: 100000
```

### Lineage

```yaml
lineage:
  - id: differential-expression
    inputs: [data/counts.csv, data/sample_metadata.csv]
    code: [analysis/differential_expression.R]
    outputs: [results/de_results.csv, figures/figure_2.png]
    environment: [renv.lock]
    claims: [manuscript/results.md]
    stale_output_severity: error
    untraceable_output_severity: warning
```

**Lineage rules:**

| Condition                              | Finding                     | Language                         |
| -------------------------------------- | --------------------------- | -------------------------------- |
| Input changed + output unchanged       | Possible stale output       | "may be stale"                   |
| Code changed + output unchanged        | Possible stale output       | "may be stale"                   |
| Output changed + code/input unchanged  | Provenance unclear          | "provenance is not demonstrated" |
| Claim changed + evidence unchanged     | Claim requires verification | "requires verification"          |
| Environment changed + output unchanged | Reproduction recommended    | "reproduction recommended"       |
| Result changed + manuscript unchanged  | Written claim may be stale  | "may be stale"                   |

### Claims

```yaml
claims:
  - id: il6-treatment-effect
    source:
      path: manuscript/results.md
      marker: BIOTRACE:il6-treatment-effect
    evidence:
      path: results/de_results.csv
      match:
        gene: IL6
    assertions:
      - field: log2FoldChange
        operator: ">="
        value: 1.7
      - field: padj
        operator: "<"
        value: 0.01
```

Supported operators: `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`, `matches`

### Figure provenance

```yaml
figures:
  - path: figures/figure_2.png
    generated_by: [analysis/figure_2.R]
    depends_on: [results/de_results.csv]
    caption:
      path: manuscript/figures.md
      marker: figure-2
    require_provenance_sidecar: true
```

Sidecar file `figures/figure_2.png.biotrace.json`:

```json
{
  "schema_version": "1.0",
  "figure": "figures/figure_2.png",
  "generated_at": "2026-01-15T10:30:00Z",
  "command": "Rscript analysis/figure_2.R",
  "inputs": {
    "results/de_results.csv": "sha256:abc123..."
  },
  "environment": {
    "renv.lock": "sha256:def456..."
  }
}
```

### Reproducibility

```yaml
reproducibility:
  require_environment: true
  require_lockfile: true
  entrypoints: ["Rscript analysis/differential_expression.R"]
  seed_patterns: ["set.seed(", "random_state=", "numpy.random.seed("]
  require_session_info: false
  weights:
    environment_definition: 15
    dependency_lock: 15
    dependency_constraints: 10
    random_seed: 10
    documented_entrypoint: 15
    output_manifest: 15
    figure_provenance: 10
    data_checksums: 5
    session_information: 5
```

---

## Reproducibility Score Formula

```
score = (sum of passed component weights) / (sum of applicable component weights) × 100
```

Components marked "not applicable" do not reduce the score. The result is an integer from 0 to 100.

| Score range | Label                     |
| ----------- | ------------------------- |
| 80–100      | `reproducibility:strong`  |
| 50–79       | `reproducibility:partial` |
| 0–49        | `reproducibility:weak`    |

---

## Label Reference

BioTrace creates and manages these labels:

| Label                        | Colour | Purpose                         |
| ---------------------------- | ------ | ------------------------------- |
| `biotrace:checking`          | Blue   | Currently running               |
| `biotrace:passed`            | Green  | All checks passed               |
| `biotrace:warning`           | Amber  | Warnings found                  |
| `biotrace:blocked`           | Red    | Blocking findings               |
| `biotrace:manual-review`     | Purple | Manual review needed            |
| `data:changed`               | Blue   | Data files changed              |
| `data:valid`                 | Green  | Data files validated            |
| `data:invalid`               | Red    | Data validation failed          |
| `data:unexpected-loss`       | Red    | Unexpected data loss            |
| `metadata:valid`             | Green  | Metadata validated              |
| `metadata:warning`           | Amber  | Metadata warnings               |
| `metadata:mismatch`          | Amber  | Metadata value mismatch         |
| `metadata:missing`           | Red    | Required metadata missing       |
| `metadata:duplicate-samples` | Red    | Duplicate IDs detected          |
| `reproducibility:strong`     | Green  | Score ≥ 80                      |
| `reproducibility:partial`    | Amber  | Score 50–79                     |
| `reproducibility:weak`       | Red    | Score < 50                      |
| `reproducibility:regression` | Red    | Score decreased                 |
| `claim:verified`             | Green  | Claim verified                  |
| `claim:stale`                | Amber  | Claim may be stale              |
| `claim:unsupported`          | Red    | Claim unsupported               |
| `claim:manual-review`        | Purple | Claim needs review              |
| `results:verified`           | Green  | Results traceable               |
| `results:changed`            | Blue   | Results changed                 |
| `results:untraceable`        | Amber  | Results untraceable             |
| `figure:verified`            | Green  | Figure provenance verified      |
| `figure:stale`               | Amber  | Figure may be stale             |
| `figure:missing`             | Red    | Figure missing                  |
| `figure:provenance-missing`  | Amber  | Provenance missing              |
| `ai:reviewed`                | Purple | AI observations provided        |
| `ai:suggestion`              | Purple | AI suggestion                   |
| `ai:unavailable`             | Amber  | AI unavailable (non-blocking)   |
| `ai:manual-verification`     | Purple | AI suggests manual verification |

Exclusive label groups ensure only one overall status and one reproducibility label remain at a time.

---

## Outputs

| Output                    | Description                             |
| ------------------------- | --------------------------------------- |
| `status`                  | `passed`, `warning`, or `error`         |
| `score`                   | Reproducibility score 0–100             |
| `report-path`             | Path to the JSON report                 |
| `findings-count`          | Total findings                          |
| `blocking-findings-count` | Findings at or above `fail-on` severity |

---

## Action Inputs

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

---

## Security Model

- **Never executes untrusted code** from pull requests
- **Never sources** `.Rprofile`, shell profiles, or repository scripts
- **Path traversal protection** — all paths validated against workspace
- **Symlink escape protection** — symlinks resolved and checked
- **Secret redaction** — tokens, keys, and passwords redacted before display or AI transmission
- **No `pull_request_target`** in recommended workflows
- **Fork PR safe** — deterministic checks run without secrets; AI is skipped when secrets are unavailable
- **Minimum permissions** — only `contents: read`, `pull-requests: write`, `issues: write`, `checks: write`

---

## Privacy Model for AI

- Binary biological datasets (FASTQ, BAM, H5AD, RDS) are **never sent**
- Files matching `never_send` patterns are **excluded**
- Secrets and credentials are **redacted** before transmission
- Patch content is **truncated** to configured byte limits
- Only **changed file snippets** are included, not entire files
- AI observations are **advisory only** and **never override** deterministic checks
- AI **never marks** deterministic checks as passed
- AI **never alters** the reproducibility score
- If AI fails and `fail_open` is true, deterministic checks continue unaffected

---

## Fork Pull-Request Behaviour

| Scenario                | Deterministic checks | AI                      | Labels              | Comments            |
| ----------------------- | -------------------- | ----------------------- | ------------------- | ------------------- |
| Same-repo PR            | ✅ Full              | ✅ If key available     | ✅                  | ✅                  |
| Fork PR                 | ✅ Full              | ❌ Skipped (no secrets) | ✅                  | ✅                  |
| Fork PR (no write perm) | ✅ Full              | ❌ Skipped              | ❌ Graceful warning | ❌ Graceful warning |

---

## Example PR Report

```
## BioTrace report

**Status:** ⚠️ warning
**Reproducibility:** 82/100
**Files checked:** 4 | **Claims:** 2 | **Figures:** 3

### Blocking findings

(None)

### Warnings

- ⚠️ **Possible stale output** `results/de_results.csv`: input changed but output did not
- ⚠️ **Figure may be stale** `figures/figure_2.png`: upstream dependency changed

### Verified checks

- ✅ **Metadata valid** `data/sample_metadata.csv`: 6 rows, 3 columns
- ✅ **Claim verified** "il6-treatment-effect" passed
- ✅ **FASTA valid** `references/genome.fa`: 25 records

### AI-assisted observations

> **Advisory only** — AI does not override deterministic checks.

- **Possible methods drift** (conf: 88%, verify): The filtering threshold appears
  to change from 10 to 20 detected cells.
  - Files: `analysis/filtering.R`, `manuscript/methods.md`

<details>
<summary>Reproducibility breakdown</summary>

| Component | Weight | Result |
|---|---|---|
| environment_definition | 15 | ✅ |
| dependency_lock | 15 | ✅ |
| dependency_constraints | 10 | ✅ |
| random_seed | 10 | ❌ |
| documented_entrypoint | 15 | ✅ |
| output_manifest | 15 | ✅ |
| figure_provenance | 10 | ✅ |
| data_checksums | 5 | ✅ |
| session_information | 5 | — |

</details>
```

---

## Supported Formats

| Format                                       | Validation       | Streaming |
| -------------------------------------------- | ---------------- | --------- |
| CSV                                          | ✅ Full          | N/A       |
| TSV                                          | ✅ Full          | N/A       |
| FASTA                                        | ✅ Full          | ✅        |
| FASTQ                                        | ✅ Full          | ✅        |
| Figure provenance sidecar (`.biotrace.json`) | ✅ Schema + hash | N/A       |
| H5AD                                         | ❌ Future        | —         |

---

## Limitations

- BioTrace **does not execute** analysis code — it checks traceability statically
- H5AD validation is **not yet implemented** (planned for future release)
- R session information checking is **not yet implemented**
- AI observations are **advisory only** and may contain errors
- BioTrace does **not** verify biological or clinical correctness
- Very large files are **skipped** with size limits (configurable)
- Git commit-graph provenance comparisons are **approximate** for rebased branches

---

## Roadmap

- [ ] H5AD validation via optional Python helper
- [ ] R session information detection
- [ ] Compressed FASTQ (`.gz`) streaming support
- [ ] Base-revision FASTA record loss detection
- [ ] Multi-repository lineage support
- [ ] SARIF report output

---

## Troubleshooting

| Symptom                                           | Cause                                                                                                       | Fix                                                                                                                                                                                                                            |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Resource not accessible by integration`          | Workflow token lacks write permissions                                                                      | Add `permissions: pull-requests: write, issues: write` to the workflow, or enable "Read and write permissions" in Settings → Actions → General. BioTrace degrades gracefully and continues without labels/comments either way. |
| No labels appear on the PR                        | Missing `issues: write` permission, or `create-labels: "false"`                                             | Verify the permission and the `create-labels` input; check the Action logs for permission errors.                                                                                                                              |
| No PR comment appears                             | Missing `pull-requests: write` permission, or `comment-mode: disabled`                                      | Verify the permission and the `comment-mode` input.                                                                                                                                                                            |
| `fetch-depth` error / missing base commit         | Checkout used the default shallow clone                                                                     | Add `fetch-depth: 0` to the `actions/checkout` step.                                                                                                                                                                           |
| `AI status: no-key` in the report                 | `BIOTRACE_AI_API_KEY` isn't set, or the workflow ran from a fork                                            | Expected for fork PRs (forks can't access parent secrets). For same-repo PRs, verify the secret exists.                                                                                                                        |
| `AI status: failed` in the report                 | The provider returned invalid JSON, the schema didn't match, or the request timed out                       | Non-blocking by default (`fail_open: true`). Check the model identifier, API key validity, and provider status.                                                                                                                |
| `check-dist` CI step fails                        | Source changed but `dist/index.js` wasn't rebuilt                                                           | Run `npm run build`, commit `dist/index.js`.                                                                                                                                                                                   |
| Marketplace publish option missing                | Repo not public, `action.yml` not at repo root, name already taken, or `dist/index.js` missing from the tag | Verify each of those conditions.                                                                                                                                                                                               |
| AI and labels don't work on a fork PR             | Expected — fork PRs can't access secrets and `pull_request` has a read-only token                           | BioTrace automatically skips AI; labels/comments may need maintainer approval to run at all.                                                                                                                                   |
| Branch protection doesn't list the BioTrace check | Required status checks use the workflow **job name**                                                        | Use the job name (e.g. `biotrace`) from your workflow file, not the Action name.                                                                                                                                               |

For questions not covered here, see [SUPPORT.md](SUPPORT.md).

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture, and pull-request checklist.

---

## License

Copyright 2026 rotsl

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

---

## Citation

```bibtex
@software{biotrace2026,
  author = {rotsl},
  title = {BioTrace: Trace biological results from data and code to figures and scientific claims},
  year = {2026},
  url = {https://github.com/rotsl/biotrace}
}
```
