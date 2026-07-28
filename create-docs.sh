#!/usr/bin/env bash
# Save as: create-docs.sh
# Run: chmod +x create-docs.sh && ./create-docs.sh

cat > README.md << 'READMEEOF'
<p align="center">
  <img src="https://img.shields.io/badge/BioTrace-v1.0.0-green" alt="BioTrace version" />
  <img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="License" />
  <img src="https://img.shields.io/badge/Node.js-20-339933" alt="Node.js 20" />
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6" alt="TypeScript strict" />
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

| Feature | Description |
|---------|-------------|
| **Metadata validation** | CSV/TSV column checks, uniqueness, allowed values, minimum group sizes |
| **FASTA validation** | Streaming validation, alphabet checks, duplicate IDs, length limits |
| **FASTQ validation** | 4-line record structure, quality-length matching, truncation detection |
| **Lineage tracing** | Detects stale outputs, untraceable results, outdated claims |
| **Numerical claims** | Verify manuscript claims against CSV/TSV evidence files |
| **Figure provenance** | Sidecar `.biotrace.json` provenance with hash verification |
| **Reproducibility score** | Transparent weighted scoring (0–100) |
| **PR labels** | Auto-managed, namespaced, exclusive-group labels |
| **Persistent comment** | One updated PR comment, never spammed |
| **AI-assisted observations** | Optional, bring-your-own-key, advisory only |
| **Security** | Path traversal protection, secret redaction, no untrusted code execution |

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
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: biotrace
        uses: RohanR/biotrace@v1
        with:
          config: .github/biotrace.yml
          github-token: ${{ github.token }}
          fail-on: error
          ai-enabled: "false"
      - if: always()
        uses: actions/upload-artifact@v4
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
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: RohanR/biotrace@v1
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
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: biotrace
        uses: RohanR/biotrace@v1
        with:
          config: .github/biotrace.yml
          github-token: ${{ github.token }}
          ai-enabled: auto
          ai-provider: openai-compatible
          ai-model: ${{ vars.BIOTRACE_AI_MODEL }}
        env:
          BIOTRACE_AI_API_KEY: ${{ secrets.BIOTRACE_AI_API_KEY }}
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: biotrace-report
          path: ${{ steps.biotrace.outputs.report-path }}
```

---

## Configuration Reference

### Top-level fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `version` | integer | ✅ | — | Must be `1` |
| `repository` | object | ❌ | — | Languages, organisms, analysis types |
| `files` | object | ❌ | `{}` | Metadata, FASTA, FASTQ file definitions |
| `lineage` | array | ❌ | `[]` | Data-to-claim lineage definitions |
| `reproducibility` | object | ❌ | see defaults | Scoring weights and requirements |
| `claims` | array | ❌ | `[]` | Numerical claim definitions |
| `figures` | array | ❌ | `[]` | Figure provenance definitions |
| `labels` | object | ❌ | see defaults | Label creation and colours |
| `comment` | object | ❌ | see defaults | PR comment behaviour |
| `ai` | object | ❌ | see defaults | AI provider configuration |

### Metadata file

```yaml
files:
  metadata:
    - path: data/sample_metadata.csv
      delimiter: auto              # auto | "," | "\t" | ";"
      id_column: sample_id
      required_columns: [sample_id, condition, biological_replicate]
      non_null: [sample_id, condition]
      unique: [sample_id]
      allowed_values:
        condition: [control, treatment]
      minimum_group_size:
        group_by: condition
        value: 3
        severity: warning          # info | warning | error
```

### FASTA file

```yaml
files:
  fasta:
    - glob: "references/**/*.fa"
      alphabet: dna                # dna | rna | protein | unrestricted
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

| Condition | Finding | Language |
|-----------|---------|----------|
| Input changed + output unchanged | Possible stale output | "may be stale" |
| Code changed + output unchanged | Possible stale output | "may be stale" |
| Output changed + code/input unchanged | Provenance unclear | "provenance is not demonstrated" |
| Claim changed + evidence unchanged | Claim requires verification | "requires verification" |
| Environment changed + output unchanged | Reproduction recommended | "reproduction recommended" |
| Result changed + manuscript unchanged | Written claim may be stale | "may be stale" |

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

| Score range | Label |
|-------------|-------|
| 80–100 | `reproducibility:strong` |
| 50–79 | `reproducibility:partial` |
| 0–49 | `reproducibility:weak` |

---

## Label Reference

BioTrace creates and manages these labels:

| Label | Colour | Purpose |
|-------|--------|---------|
| `biotrace:checking` | Blue | Currently running |
| `biotrace:passed` | Green | All checks passed |
| `biotrace:warning` | Amber | Warnings found |
| `biotrace:blocked` | Red | Blocking findings |
| `biotrace:manual-review` | Purple | Manual review needed |
| `data:changed` | Blue | Data files changed |
| `data:valid` | Green | Data files validated |
| `data:invalid` | Red | Data validation failed |
| `data:unexpected-loss` | Red | Unexpected data loss |
| `metadata:valid` | Green | Metadata validated |
| `metadata:warning` | Amber | Metadata warnings |
| `metadata:mismatch` | Amber | Metadata value mismatch |
| `metadata:missing` | Red | Required metadata missing |
| `metadata:duplicate-samples` | Red | Duplicate IDs detected |
| `reproducibility:strong` | Green | Score ≥ 80 |
| `reproducibility:partial` | Amber | Score 50–79 |
| `reproducibility:weak` | Red | Score < 50 |
| `reproducibility:regression` | Red | Score decreased |
| `claim:verified` | Green | Claim verified |
| `claim:stale` | Amber | Claim may be stale |
| `claim:unsupported` | Red | Claim unsupported |
| `claim:manual-review` | Purple | Claim needs review |
| `results:verified` | Green | Results traceable |
| `results:changed` | Blue | Results changed |
| `results:untraceable` | Amber | Results untraceable |
| `figure:verified` | Green | Figure provenance verified |
| `figure:stale` | Amber | Figure may be stale |
| `figure:missing` | Red | Figure missing |
| `figure:provenance-missing` | Amber | Provenance missing |
| `ai:reviewed` | Purple | AI observations provided |
| `ai:suggestion` | Purple | AI suggestion |
| `ai:unavailable` | Amber | AI unavailable (non-blocking) |
| `ai:manual-verification` | Purple | AI suggests manual verification |

Exclusive label groups ensure only one overall status and one reproducibility label remain at a time.

---

## Outputs

| Output | Description |
|--------|-------------|
| `status` | `passed`, `warning`, or `error` |
| `score` | Reproducibility score 0–100 |
| `report-path` | Path to the JSON report |
| `findings-count` | Total findings |
| `blocking-findings-count` | Findings at or above `fail-on` severity |

---

## Action Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `config` | `.github/biotrace.yml` | Path to configuration |
| `github-token` | `${{ github.token }}` | Token for PR/label/comment access |
| `fail-on` | `error` | Minimum severity to fail: `info`, `warning`, `error` |
| `create-labels` | `true` | Create missing labels |
| `comment-mode` | `update-existing` | `update-existing`, `create-new`, or `disabled` |
| `report-path` | `biotrace-report.json` | Output path for JSON report |
| `ai-enabled` | `auto` | `auto`, `true`, or `false` |
| `ai-provider` | `openai-compatible` | AI provider adapter |
| `ai-model` | `""` | Model identifier (user provides) |
| `ai-base-url` | `""` | Custom base URL for OpenAI-compatible API |
| `ai-key-env` | `BIOTRACE_AI_API_KEY` | Environment variable name for API key |

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

| Scenario | Deterministic checks | AI | Labels | Comments |
|----------|---------------------|-----|--------|----------|
| Same-repo PR | ✅ Full | ✅ If key available | ✅ | ✅ |
| Fork PR | ✅ Full | ❌ Skipped (no secrets) | ✅ | ✅ |
| Fork PR (no write perm) | ✅ Full | ❌ Skipped | ❌ Graceful warning | ❌ Graceful warning |

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

| Format | Validation | Streaming |
|--------|-----------|-----------|
| CSV | ✅ Full | N/A |
| TSV | ✅ Full | N/A |
| FASTA | ✅ Full | ✅ |
| FASTQ | ✅ Full | ✅ |
| Figure provenance sidecar (`.biotrace.json`) | ✅ Schema + hash | N/A |
| H5AD | ❌ Future | — |

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture, and pull-request checklist.

---

## License

Copyright 2026 Rohan R

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
  author = {Rohan R},
  title = {BioTrace: Trace biological results from data and code to figures and scientific claims},
  year = {2026},
  url = {https://github.com/RohanR/biotrace}
}
```
READMEEOF


cat > INSTRUCTIONS.md << 'INSTEOF'
# BioTrace — Detailed Instructions for the Repository Owner

This document covers every step from initial setup through publishing and
maintaining BioTrace on the GitHub Marketplace.

---

## Table of Contents

- [Part A: Prerequisites](#part-a-prerequisites)
- [Part B: Initial Local Setup](#part-b-initial-local-setup)
- [Part C: Test Locally](#part-c-test-locally)
- [Part D: Repository Configuration](#part-d-repository-configuration)
- [Part E: AI Provider Setup](#part-e-ai-provider-setup)
- [Part F: Creating the First Release](#part-f-creating-the-first-release)
- [Part G: Publishing to GitHub Marketplace](#part-g-publishing-to-github-marketplace)
- [Part H: Deployment to a Test Repository](#part-h-deployment-to-a-test-repository)
- [Part I: Release Maintenance](#part-i-release-maintenance)
- [Part J: Rollback](#part-j-rollback)
- [Part K: Troubleshooting](#part-k-troubleshooting)
- [Part L: Final Publishing Checklist](#part-l-final-publishing-checklist)

---

## Part A: Prerequisites

### Required tools

| Tool | Version | Check command |
|------|---------|---------------|
| Node.js | 20.x | `node --version` |
| npm | 10.x+ | `npm --version` |
| Git | 2.x+ | `git --version` |
| GitHub CLI (optional) | Latest | `gh --version` |

### Install Node.js 20

If you use `nvm`:

```bash
nvm install 20
nvm use 20
```

If you use `fnm`:

```bash
fnm install 20
fnm use 20
```

Otherwise, download from [nodejs.org](https://nodejs.org/).

### GitHub account requirements

- A **public** GitHub repository is required for Marketplace distribution.
- You need **owner** or **admin** access to the repository.
- GitHub Actions must be **enabled** in repository settings.

### Replace placeholders

Before publishing, replace these placeholders throughout the codebase:

| Placeholder | Replace with |
|-------------|-------------|
| `REPLACE_WITH_PUBLISHER` | Your name or organization, e.g. `Rohan R` |
| `REPLACE_WITH_OWNER` | Your GitHub username, e.g. `RohanR` |

Files containing placeholders:

1. `action.yml` — `author` field
2. `examples/minimal/.github/workflows/biotrace.yml` — `uses:` line
3. `examples/bulk-rna-seq/.github/workflows/biotrace.yml` — `uses:` line
4. `examples/general-bioinformatics/` — any workflow files
5. `.github/workflows/example-biotrace.yml` — `uses:` line

Find all occurrences:

```bash
grep -r "REPLACE_WITH" --include="*.yml" --include="*.yaml" --include="*.md" .
```

---

## Part B: Initial Local Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/RohanR/biotrace.git
cd biotrace
```

If you created the repo locally from the generator script:

```bash
cd biotrace
git init
git add .
git commit -m "Initial BioTrace implementation"
git remote add origin https://github.com/RohanR/biotrace.git
git branch -M main
git push -u origin main
```

### Step 2: Install dependencies

```bash
npm ci
```

If there is no `package-lock.json` yet:

```bash
npm install
```

### Step 3: Run the full validation suite

```bash
npm run all
```

This runs, in order:

1. **Format check** — `prettier --check .`
2. **Lint** — `eslint .`
3. **Type check** — `tsc --noEmit`
4. **Test with coverage** — `vitest run --coverage`
5. **Build** — `ncc build src/main.ts -o dist --minify`
6. **Verify dist** — `git diff --exit-code -- dist`

If any step fails, fix the issue before proceeding.

### Step 4: Fix formatting (if needed)

```bash
npm run format
```

### Step 5: Build the distributable

```bash
npm run build
```

This creates `dist/index.js`. **This file must be committed** because
JavaScript GitHub Actions run from the built distribution in the repository
tag, not from the TypeScript source.

### Step 6: Commit the built distribution

```bash
git add dist/index.js
git commit -m "Build dist/index.js v1.0.0"
```

---

## Part C: Test Locally

### Unit tests

```bash
npm test
```

### Unit tests with coverage

```bash
npm run test:coverage
```

Coverage thresholds are enforced:

- Statements: 85%
- Branches: 80%
- Functions: 85%
- Lines: 85%

### Watch mode (for development)

```bash
npm run test:watch
```

### Test against fixtures

The unit tests in `tests/unit/` already test against the `fixtures/`
directory files. Run them directly:

```bash
npm test
```

### Testing with a separate test repository

1. Create a new public GitHub repository (e.g. `biotrace-test`).
2. Add the sample data files from `fixtures/valid/`.
3. Add `.github/biotrace.yml` configuration.
4. Add `.github/workflows/biotrace.yml` pointing to your local Action.
5. Open pull requests to test different scenarios.

#### Using the Action from a local branch before publishing

In your test repository's workflow:

```yaml
- uses: RohanR/biotrace@main
  with:
    config: .github/biotrace.yml
```

This uses the Action from the `main` branch directly (not recommended for
production, but useful for testing).

### Test scenarios to verify

| Scenario | What to test |
|----------|-------------|
| Valid metadata | All checks pass, `metadata:valid` label applied |
| Duplicate samples | Error finding, `metadata:duplicate-samples` label |
| Stale figures | Change `data.csv` without changing `figure.png`, expect warning |
| Unsupported claim | Configure a claim that fails, expect `claim:unsupported` |
| No AI key | Set `ai-enabled: auto` with no secret, expect deterministic-only run |
| With AI key | Set `ai-enabled: auto` with a valid key, expect AI observations |
| Forked PR | Open a PR from a fork, expect deterministic checks to pass, AI skipped |

### Testing AI without exposing keys in terminal

```bash
# Set the key in your shell environment (not in a file)
export BIOTRACE_AI_API_KEY="sk-your-key-here"

# Run the Action locally using act (if installed)
# act is a tool to run GitHub Actions locally: https://github.com/nektos/act
act pull_request -s BIOTRACE_AI_API_KEY=$BIOTRACE_AI_API_KEY

# Unset when done
unset BIOTRACE_AI_API_KEY
```

**Never commit API keys.** Always use GitHub Secrets for CI.

---

## Part D: Repository Configuration

### Repository visibility

The repository must be **public** for GitHub Marketplace distribution.

Settings → General → Danger Zone → Change repository visibility → Make public

### Default branch

Use `main` as the default branch.

Settings → General → Default branch → `main`

### Actions permissions

Settings → Actions → General:

- **Allow all actions and reusable workflows** (or restrict as needed)
- **Allow GitHub Actions to create and approve pull requests**: Off

### Workflow permissions

Settings → Actions → General → Workflow permissions:

- **Read and write permissions** (needed for labels and comments)
- **Allow GitHub Actions to create and approve pull requests**: Off

Alternatively, use the more restrictive setting and rely on the workflow
file declaring explicit permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
  issues: write
  checks: write
```

### Branch protection

Settings → Branches → Add rule for `main`:

- ✅ Require a pull request before merging
- ✅ Require approvals (1)
- ✅ Require status checks to pass
  - Add: `biotrace` (or your CI job name)
- ✅ Require branches to be up to date before merging
- ✅ Require linear history

### Required status checks

Settings → Branches → Branch protection rule → Status checks:

Add the CI job names from `.github/workflows/ci.yml`:

- `format-check`
- `lint`
- `typecheck`
- `test`
- `build`
- `check-dist`

### Dependabot

The repository includes `.github/dependabot.yml`. Verify it is enabled:

Settings → Code security and analysis:

- **Dependabot alerts**: Enabled
- **Dependabot security updates**: Enabled
- **Dependabot version updates**: Enabled (configured via the YAML file)

### CodeQL

The repository includes `.github/workflows/codeql.yml`. CodeQL runs on
pushes to `main` and on pull requests.

### Secret scanning

If available for your repository:

Settings → Code security and analysis → **Secret scanning**: Enabled

### Private vulnerability reporting

Settings → Code security and analysis → **Private vulnerability reporting**: Enabled

---

## Part E: AI Provider Setup

### Step 1: AI is optional

BioTrace works fully without any AI. The `ai-enabled: auto` setting means
AI is used only when a key is available.

### Step 2: Add the API key as a repository secret

1. Go to Settings → Secrets and variables → Actions
2. Click **New repository secret**
3. Name: `BIOTRACE_AI_API_KEY`
4. Value: Your API key (e.g. `sk-...` for OpenAI)
5. Click **Add secret**

### Step 3: Add the model identifier as a repository variable

1. Go to Settings → Secrets and variables → Actions → Variables
2. Click **New repository variable**
3. Name: `BIOTRACE_AI_MODEL`
4. Value: The model identifier (e.g. `gpt-4o-mini`, `gpt-4o`)
5. Click **Add variable**

### Step 4: Configure a custom base URL (optional)

If using a non-OpenAI provider that implements the OpenAI chat completions
API:

```yaml
ai:
  base_url: "https://your-provider.example.com/v1"
```

Or set the `ai-base-url` action input.

### Step 5: Understand fork behaviour

- **Secrets are normally unavailable to workflows triggered from forks.**
- BioTrace will automatically skip AI and continue deterministic checks.
- The `ai:unavailable` label is applied only when AI would otherwise have
  been requested and label writing is available.

### Step 6: Rotate a key if exposed

If an API key is accidentally committed or leaked:

1. **Immediately** revoke the key at the provider's dashboard.
2. Generate a new key.
3. Update the GitHub secret: Settings → Secrets → `BIOTRACE_AI_API_KEY` → Update.
4. Force-push or use `git filter-branch` / BFG to remove the key from Git
   history if it was committed.
5. Consider using GitHub's secret scanning to catch future leaks.

### Step 7: Configure never_send

The default `never_send` patterns exclude binary biological data, raw
datasets, and credential files. Add additional patterns in your config:

```yaml
ai:
  never_send:
    - "data/raw/**"
    - "**/*.fastq"
    - "**/*.fastq.gz"
    - "**/*.bam"
    - "**/*.h5ad"
    - "**/.env*"
    - "**/*secret*"
```

### Step 8: Review provider data-handling

Review your AI provider's data-handling and retention policy independently.
BioTrace does not claim that any provider offers zero retention.

---

## Part F: Creating the First Release

### Step 1: Ensure everything passes

```bash
cd biotrace
npm ci
npm run all
```

All checks must pass with zero errors.

### Step 2: Verify the built distribution

```bash
npm run build
git status
```

Confirm `dist/index.js` is present and there are no uncommitted changes:

```bash
git diff --exit-code -- dist
```

### Step 3: Commit any remaining changes

```bash
git add .
git commit -m "Prepare BioTrace v1.0.0"
git push origin main
```

### Step 4: Create the version tag

Using a signed tag (recommended):

```bash
git tag -s v1.0.0 -m "BioTrace v1.0.0"
git push origin v1.0.0
```

If you don't have GPG signing set up, use an annotated tag:

```bash
git tag -a v1.0.0 -m "BioTrace v1.0.0"
git push origin v1.0.0
```

### Step 5: Create the GitHub Release

#### Via GitHub web interface

1. Go to your repository → Releases → **Draft a new release**
2. Choose the tag: `v1.0.0`
3. Release title: `BioTrace v1.0.0`
4. Description: Use the `CHANGELOG.md` content
5. Click **Publish release**

#### Via GitHub CLI

```bash
gh release create v1.0.0 \
  --title "BioTrace v1.0.0" \
  --generate-notes \
  --verify-tag
```

### Step 6: Create the floating major tag

The `v1` tag allows users to reference `@v1` and automatically receive
patch and minor updates.

```bash
git tag -f v1 v1.0.0
git push origin v1 --force
```

**Why two tags?**

- `v1.0.0` — **Immutable.** Always points to the exact same commit. Users
  who pin to `@v1.0.0` get reproducible builds.
- `v1` — **Floating.** Points to the latest `v1.x.x` release. Users who
  reference `@v1` get non-breaking updates automatically.

### Step 7: Verify the release workflow

The `.github/workflows/release.yml` workflow should have run automatically
when you pushed the tag. Check:

1. Go to Actions → Workflows → Release
2. Verify the workflow completed successfully
3. Verify the `v1` tag was created or updated

---

## Part G: Publishing to GitHub Marketplace

### Pre-publish checklist

Before publishing, verify:

- [ ] Repository is **public**
- [ ] `action.yml` is at the **repository root**
- [ ] `action.yml` has a **unique name** (`BioTrace`)
- [ ] `action.yml` has a **clear description**
- [ ] `action.yml` has valid **branding** (icon and color)
- [ ] `README.md` exists at the repository root
- [ ] `LICENSE` exists (Apache-2.0)
- [ ] `dist/index.js` exists and is committed in the release tag
- [ ] The Action has been **tested from another repository**
- [ ] Security documentation exists (`SECURITY.md`)
- [ ] No API keys or credentials are present in the codebase

### Step-by-step publishing

1. Go to your repository on GitHub.
2. Click **Releases** in the sidebar.
3. Find the release you just created (`v1.0.0`).
4. Click the **pencil icon** (Edit release).
5. Scroll to the bottom of the release edit page.
6. You should see a **Publish this Action to the GitHub Marketplace** section.
7. Check the box to publish to Marketplace.
8. Select the **category**:
   - Primary: **Continuous integration**
   - Secondary: **Code quality**
9. Accept the **GitHub Marketplace terms of service**.
10. Click **Update release** (or **Publish release**).

If the Marketplace option does not appear, check:

- Is the repository public?
- Is `action.yml` at the root?
- Does `action.yml` have a unique name?
- Is the release tag pointing to a commit that contains `dist/index.js`?

### Suggested Marketplace copy

**Name:** BioTrace

**Tagline:** Trace biological results from data and code to figures and scientific claims.

**Description:**

```
BioTrace validates biological metadata and file integrity, checks
declared data-to-result lineage, detects potentially stale figures and
claims, calculates a transparent reproducibility score, and maintains
structured pull-request labels. Optional AI-assisted observations are
available with a repository-provided API key.
```

**Primary category:** Continuous integration

**Secondary category:** Code quality

---

## Part H: Deployment to a Test Repository

### Step 1: Create a test repository

Create a new public repository (e.g. `biotrace-test`).

### Step 2: Add sample data

Copy files from `fixtures/valid/` into the test repository:

```
biotrace-test/
├── data/
│   └── sample_metadata.csv
├── results/
│   └── de_results.csv
├── references/
│   └── sequences.fa
├── .github/
│   ├── biotrace.yml
│   └── workflows/
│       └── biotrace.yml
```

### Step 3: Create the configuration

`.github/biotrace.yml`:

```yaml
version: 1
files:
  metadata:
    - path: data/sample_metadata.csv
      required_columns: [sample_id, condition]
      unique: [sample_id]
```

### Step 4: Create the workflow

`.github/workflows/biotrace.yml`:

```yaml
name: BioTrace
on: pull_request
permissions:
  contents: read
  pull-requests: write
  issues: write
  checks: write
jobs:
  biotrace:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - id: biotrace
        uses: RohanR/biotrace@v1
        with:
          config: .github/biotrace.yml
          github-token: ${{ github.token }}
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: biotrace-report
          path: ${{ steps.biotrace.outputs.report-path }}
```

### Step 5: Open a test PR

1. Create a branch: `git checkout -b test/metadata-change`
2. Modify `data/sample_metadata.csv` (e.g. add a duplicate sample ID)
3. Commit and push: `git push origin test/metadata-change`
4. Open a pull request on GitHub

### Step 6: Check the results

- **Logs:** Go to Actions → the BioTrace workflow run → expand the logs
- **Labels:** Check the PR labels panel for `biotrace:*`, `metadata:*`, etc.
- **Comment:** Check the PR conversation for the BioTrace report comment
- **Report:** Download the `biotrace-report` artifact from the workflow run
- **Failure:** If `fail-on: error` and there are errors, the check should fail

### Step 7: Test permissions

Test with reduced permissions:

```yaml
permissions:
  contents: read
  # Remove write permissions — labels and comments should degrade gracefully
```

BioTrace should continue running and add a warning about missing write
permissions instead of crashing.

---

## Part I: Release Maintenance

### Patch release (v1.0.1)

Fix a bug without changing the API:

```bash
# Fix the bug, commit
git add .
git commit -m "Fix: correct CSV delimiter detection for semicolons"
git push origin main

# Verify CI passes, then create the patch release
npm run build
git add dist/index.js
git commit -m "Build dist for v1.0.1"
git push origin main

git tag -s v1.0.1 -m "BioTrace v1.0.1"
git push origin v1.0.1

# Update the floating v1 tag
git tag -f v1 v1.0.1
git push origin v1 --force

# Create GitHub Release
gh release create v1.0.1 \
  --title "BioTrace v1.0.1" \
  --generate-notes \
  --verify-tag
```

### Minor release (v1.1.0)

Add a new feature, backward-compatible:

```bash
# Add the feature, commit
git add .
git commit -m "Feature: add H5AD metadata inspection"
git push origin main

# Update CHANGELOG.md
# Update version in package.json to 1.1.0

npm ci
npm run all
npm run build

git add .
git commit -m "Prepare BioTrace v1.1.0"
git push origin main

git tag -s v1.1.0 -m "BioTrace v1.1.0"
git push origin v1.1.0

# Update the floating v1 tag
git tag -f v1 v1.1.0
git push origin v1 --force

gh release create v1.1.0 \
  --title "BioTrace v1.1.0" \
  --generate-notes \
  --verify-tag
```

### Major release (v2.0.0)

Breaking change:

1. Create a `v2` branch or tag.
2. Update `action.yml` and configuration schema.
3. Create a migration guide.
4. Keep `v1` tag pointing to the last `v1.x.x` release.
5. **Do not** move `v1` to point to `v2.x.x`.
6. Announce the deprecation timeline for `v1`.

### Deprecation policy

- Support the current major version with security patches for at least
  6 months after the next major version is released.
- Announce deprecation in the README and CHANGELOG.
- Add a deprecation warning in the Action output for the old major version.

### Security fixes

For security issues:

1. Fix the vulnerability in a private branch or fork.
2. Create a patch release following the patch release process.
3. Publish a GitHub Security Advisory.
4. Backport to still-supported older major versions.

---

## Part J: Rollback

### Remove an incorrect Marketplace release

1. Go to your repository → Releases
2. Find the incorrect release
3. Click **Delete** (this removes the release but not the tag)
4. If the release was published to Marketplace, go to
   Settings → Marketplace → manage your listing and unpublish

### Mark a release as deprecated

1. Edit the release on GitHub
2. Add `⚠️ DEPRECATED` to the title
3. Add a deprecation notice in the description
4. Point users to the corrected version

### Move v1 back to a known-good version

```bash
# Find the last known-good commit
git log --oneline v1.0.0

# Force-move the v1 tag
git tag -f v1 v1.0.0
git push origin v1 --force
```

**Important:** Communicate this change to users. The `v1` tag should only
be force-moved for serious issues, not for routine updates.

### Publish a corrective patch

```bash
# Fix the issue
git commit -m "Fix: correct security vulnerability in path handling"
git push origin main

npm run build
git add dist/index.js
git commit -m "Build dist for v1.0.2"
git push origin main

git tag -s v1.0.2 -m "BioTrace v1.0.2 - security fix"
git push origin v1.0.2

git tag -f v1 v1.0.2
git push origin v1 --force

gh release create v1.0.2 \
  --title "BioTrace v1.0.2 - Security Fix" \
  --notes "Fixes a path traversal vulnerability. All users should upgrade." \
  --verify-tag
```

### Rotate a compromised secret

1. Revoke the exposed secret at the provider.
2. Generate a new secret.
3. Update the GitHub repository secret.
4. Audit recent workflow runs for unauthorized access.
5. If a GitHub token was exposed, it auto-expires, but review the
   audit log.

### Revoke a compromised release or tag

1. Delete the release on GitHub.
2. Delete the tag: `git push origin :refs/tags/v1.0.x`
3. Publish a corrected release.
4. Do not try to hide the incident — document it in the CHANGELOG and
   SECURITY.md.

**Prefer a corrective release over rewriting history.**

---

## Part K: Troubleshooting

### Resource not accessible by integration

**Symptom:** `Error: Resource not accessible by integration`

**Cause:** The workflow token lacks write permissions.

**Fix:**
- Add `permissions: pull-requests: write, issues: write` to the workflow
- Or enable "Read and write permissions" in Settings → Actions → General
- BioTrace will degrade gracefully and continue without labels/comments

### Labels not being created

**Symptom:** No labels appear on the PR.

**Cause:** Missing `issues: write` permission, or `create-labels: "false"`.

**Fix:**
- Verify `permissions: issues: write` in the workflow
- Verify `create-labels` input is set to `"true"`
- Check the Action logs for permission errors

### PR comment not being written

**Symptom:** No comment appears on the PR.

**Cause:** Missing `pull-requests: write` permission, or `comment-mode: disabled`.

**Fix:**
- Verify `permissions: pull-requests: write` in the workflow
- Verify `comment-mode` is not set to `disabled`
- Check the Action logs for comment errors

### Action cannot find base commit

**Symptom:** `fetch-depth` error or missing base commit.

**Cause:** The checkout step uses the default shallow clone.

**Fix:**
```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0  # Required for full history
```

### AI key unavailable

**Symptom:** `AI status: no-key` in the report.

**Cause:** The `BIOTRACE_AI_API_KEY` secret is not set, or the workflow
was triggered from a fork (forks cannot access parent secrets).

**Fix:**
- This is expected behaviour for fork PRs. BioTrace continues with
  deterministic checks.
- For same-repo PRs, verify the secret exists in
  Settings → Secrets and variables → Actions.

### AI response rejected

**Symptom:** `AI status: failed` in the report.

**Cause:** The AI provider returned invalid JSON, the schema didn't match,
or the request timed out.

**Fix:**
- If `fail_open: true` (default), this is non-blocking
- Check the model identifier is correct
- Verify the API key is valid
- Check the provider's status page

### dist/index.js out of date

**Symptom:** `check-dist` CI step fails.

**Cause:** The source code was changed but `dist/index.js` was not rebuilt.

**Fix:**
```bash
npm run build
git add dist/index.js
git commit -m "Rebuild dist"
git push
```

### Marketplace publish option missing

**Symptom:** No "Publish to Marketplace" option in the release editor.

**Fix:**
- Verify the repository is public
- Verify `action.yml` is at the repository root
- Verify the `action.yml` `name` field is unique (not already taken)
- Verify `dist/index.js` exists in the tagged commit

### Invalid action.yml

**Symptom:** GitHub Actions cannot parse the action.

**Fix:**
- Validate the YAML syntax: `yamllint action.yml`
- Verify all required fields are present
- Check that `runs.using` is `node20` and `runs.main` is `dist/index.js`

### Duplicate Marketplace Action name

**Symptom:** Cannot publish because the name is already taken.

**Fix:**
- Choose a different name in `action.yml`
- Update the README and all references

### Forked PR behaviour

**Symptom:** AI and labels don't work on fork PRs.

**Cause:** This is expected. Fork PRs cannot access secrets, and the
`pull_request` event has read-only token scope.

**Fix:**
- BioTrace automatically skips AI for fork PRs
- Labels and comments may require maintainers to approve workflow runs
- The `pull_request` event (not `pull_request_target`) is recommended for
  security

### Large FASTA or FASTQ memory limits

**Symptom:** Out of memory or timeout for large files.

**Fix:**
- BioTrace streams FASTA/FASTQ, so memory should be manageable
- If files exceed size limits, a warning is issued and the file is skipped
- Adjust limits in the code if needed (MAX_FASTA_SIZE, MAX_FASTQ_SIZE)

### Configuration schema errors

**Symptom:** `Configuration validation failed` with path references.

**Fix:**
- Read the error message carefully — it includes the property path
- Check against the schema in `schemas/biotrace-config.schema.json`
- Verify the `version` field is `1`
- Use `yamllint` to check YAML syntax

### JSON report not uploaded

**Symptom:** The `upload-artifact` step is skipped because an earlier step
failed.

**Fix:**
- The upload step uses `if: always()`, which should run even on failure
- BioTrace writes the report before calling `setFailed`, so the report
  should exist
- Check the `report-path` input matches the artifact path

### Branch protection not recognising the check

**Symptom:** The BioTrace check is not listed as a required status check.

**Fix:**
- The check name comes from the job name in the workflow
- Use the job name (e.g. `biotrace`) as the required status check
- If using a custom job name, use that name in branch protection

---

## Part L: Final Publishing Checklist

Before publishing BioTrace v1.0.0, verify every item:

### Code quality

- [ ] TypeScript compiles without errors: `npm run typecheck`
- [ ] Formatting passes: `npm run format:check`
- [ ] Lint passes: `npm run lint`
- [ ] All tests pass: `npm test`
- [ ] Coverage thresholds met: `npm run test:coverage`
- [ ] Security tests pass

### Build

- [ ] `dist/index.js` is generated: `npm run build`
- [ ] `dist/index.js` matches the source: `npm run check-dist`
- [ ] Source maps do not leak local paths

### Metadata

- [ ] `action.yml` is valid and at the repository root
- [ ] `action.yml` has a unique name
- [ ] `action.yml` author is set to `Rohan R`
- [ ] JSON schemas are valid: `npm run validate:schemas`
- [ ] Examples validate against the config schema

### Security

- [ ] No API keys or credentials in the codebase
- [ ] No untrusted repository code is executed
- [ ] Path traversal protection is in place
- [ ] Secret redaction is working (tested)
- [ ] `SECURITY.md` is present

### Documentation

- [ ] `README.md` is complete and accurate
- [ ] `CONTRIBUTING.md` is present
- [ ] `CHANGELOG.md` is present with v1.0.0 entry
- [ ] `LICENSE` is present (Apache-2.0, copyright Rohan R 2026)
- [ ] `SECURITY.md` is present
- [ ] `SUPPORT.md` is present
- [ ] `CODE_OF_CONDUCT.md` is present
- [ ] `CITATION.cff` is present

### Placeholders

- [ ] All `REPLACE_WITH_OWNER` replaced with `RohanR`
- [ ] All `REPLACE_WITH_PUBLISHER` replaced with `Rohan R`
- [ ] No remaining placeholder strings in the codebase

### Integration

- [ ] Local mocked integration run produces:
  - [ ] Labels (when permissions allow)
  - [ ] Persistent PR comment content
  - [ ] Step summary
  - [ ] JSON report
  - [ ] Correct exit status

### GitHub

- [ ] Repository is public
- [ ] CI workflow passes on `main`
- [ ] Release workflow is present
- [ ] Dependabot is configured
- [ ] Branch protection is enabled on `main`
- [ ] Required status checks are configured

### Testing

- [ ] Tested from a separate repository
- [ ] Tested with valid metadata
- [ ] Tested with duplicate samples
- [ ] Tested with stale figures
- [ ] Tested with unsupported claims
- [ ] Tested without AI key
- [ ] Tested with AI key (optional)
- [ ] Tested with fork PR (AI skipped)

### Release

- [ ] `v1.0.0` tag created and pushed
- [ ] `v1` floating tag created and pushed
- [ ] GitHub Release created
- [ ] Marketplace publication completed (if desired)

---

## Quick Reference Commands

```bash
# Full validation
npm run all

# Just build
npm run build

# Just test
npm test

# Create a patch release
git tag -s v1.0.1 -m "BioTrace v1.0.1"
git push origin v1.0.1
git tag -f v1 v1.0.1
git push origin v1 --force

# Create a minor release
git tag -s v1.1.0 -m "BioTrace v1.1.0"
git push origin v1.1.0
git tag -f v1 v1.1.0
git push origin v1 --force

# Rollback v1 to a known-good version
git tag -f v1 v1.0.0
git push origin v1 --force

# Find all placeholders
grep -r "REPLACE_WITH" --include="*.yml" --include="*.md" .

# Check for secrets in the codebase
git log --all --full-history -- "*.env" "*secret*" "*key*"
```

---

*End of INSTRUCTIONS.md*
INSTEOF

echo "✅ Created README.md and INSTRUCTIONS.md"
echo "README.md: $(wc -l < README.md) lines"
echo "INSTRUCTIONS.md: $(wc -l < INSTRUCTIONS.md) lines"
