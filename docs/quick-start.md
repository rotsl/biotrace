# Quick Start

## 1. Create the configuration file

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

## 2. Add the workflow

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

## 3. Open a pull request

BioTrace runs automatically and posts a report comment on your PR.

## No-AI example

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

## Optional AI example

Bring-your-own-key. AI observations are advisory only and never override
deterministic checks. `ai-model` is optional — leave it blank and BioTrace
picks a current model automatically:

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
        env:
          BIOTRACE_AI_API_KEY: ${{ secrets.BIOTRACE_AI_API_KEY }}
      - if: always()
        uses: actions/upload-artifact@v7
        with:
          name: biotrace-report
          path: ${{ steps.biotrace.outputs.report-path }}
```

`ai-provider` also accepts a comma-separated priority list (Claude and Gemini are supported too)
so BioTrace falls through to a backup provider if the first one fails — see
[AI configuration](configuration.md#ai-configuration) for multi-provider setup.

## What a report looks like

```text
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

Next: see the full [Configuration Reference](configuration.md) for every
available field.
