# Configuration Reference

## Top-level fields

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

## Metadata file

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

## FASTA file

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

## FASTQ file

```yaml
files:
  fastq:
    - glob: "data/**/*.fq"
      alphabet: dna
      unique_ids: false
      reject_empty_sequences: true
      maximum_records: 100000
```

## Lineage

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

### Lineage rules

| Condition                              | Finding                     | Language                         |
| -------------------------------------- | --------------------------- | -------------------------------- |
| Input changed + output unchanged       | Possible stale output       | "may be stale"                   |
| Code changed + output unchanged        | Possible stale output       | "may be stale"                   |
| Output changed + code/input unchanged  | Provenance unclear          | "provenance is not demonstrated" |
| Claim changed + evidence unchanged     | Claim requires verification | "requires verification"          |
| Environment changed + output unchanged | Reproduction recommended    | "reproduction recommended"       |
| Result changed + manuscript unchanged  | Written claim may be stale  | "may be stale"                   |

## Claims

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

## Figure provenance

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

## Reproducibility

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

### Reproducibility score formula

```
score = (sum of passed component weights) / (sum of applicable component weights) × 100
```

Components marked "not applicable" do not reduce the score. The result is an
integer from 0 to 100.

| Score range | Label                     |
| ----------- | ------------------------- |
| 80–100      | `reproducibility:strong`  |
| 50–79       | `reproducibility:partial` |
| 0–49        | `reproducibility:weak`    |

## AI configuration

AI-assisted observations are optional, bring-your-own-key, and advisory only — they never
override deterministic checks or the reproducibility score. `provider` accepts either a single
provider name or an ordered priority list; if the first provider has no key configured or its
call fails, BioTrace automatically falls through to the next one.

```yaml
ai:
  enabled: auto # auto | "true" | "false"
  provider: [openai-compatible, anthropic] # or a single string, e.g. anthropic
  model: "" # optional; blank = auto-discovered per provider
  base_url: "" # optional override for the primary provider only
  tasks: [pr_summary, method_drift, claim_candidates, reviewer_checklist]
  fail_open: true
  minimum_confidence: 0.7
  maximum_changed_files: 100
  maximum_patch_bytes: 150000
  never_send: ["data/raw/**", "**/*secret*"]
```

| Field                   | Type             | Default             | Description                                               |
| ----------------------- | ---------------- | -------------------- | ---------------------------------------------------------- |
| `enabled`               | string           | `auto`               | `auto`, `"true"`, or `"false"`                             |
| `provider`              | string or array  | `openai-compatible`  | One or more of `openai-compatible`, `anthropic`, `gemini`  |
| `model`                 | string           | `""`                 | Model for the primary provider; blank = auto-discovered   |
| `base_url`              | string           | `""`                 | Base URL override for the primary provider                |
| `tasks`                 | array            | see defaults         | Which AI tasks to request                                  |
| `fail_open`             | boolean          | `true`               | Whether an AI failure blocks the run                       |
| `minimum_confidence`    | number           | `0.8`                | Drops observations below this confidence                   |
| `maximum_changed_files` | integer          | `100`                | Cap on files sent to the AI provider                       |
| `maximum_patch_bytes`   | integer          | `150000`             | Truncates patch content to this size                       |
| `never_send`            | array            | see defaults         | Glob patterns always excluded from AI requests              |

### Model auto-discovery

Leaving `model` blank makes BioTrace fetch the provider's current model list and pick a sensible
default automatically, avoiding a hardcoded model name that the provider later renames or
retires. This applies independently to every provider in the priority list — a `model` you set
only applies to the primary (first) provider; any fallback provider always auto-discovers its own
model, since a model identifier from one provider is never valid for another.

### API keys

`ai-key-env` (an `action.yml` input, not a config file field) names the environment variable
holding the primary provider's API key, defaulting to `BIOTRACE_AI_API_KEY`. Providers listed
after the first are looked up via fixed conventional environment variable names instead of
additional inputs:

| Provider           | Conventional environment variable |
| ------------------- | ---------------------------------- |
| `openai-compatible` | `BIOTRACE_OPENAI_API_KEY`           |
| `anthropic`          | `BIOTRACE_ANTHROPIC_API_KEY`        |
| `gemini`             | `BIOTRACE_GEMINI_API_KEY`           |

Set these in the workflow's `env:` block, sourced from repository or organization secrets so
GitHub masks them in logs:

```yaml
    - uses: rotsl/biotrace@v1
      with:
        ai-enabled: auto
        ai-provider: openai-compatible,anthropic,gemini
      env:
        BIOTRACE_AI_API_KEY: ${{ secrets.BIOTRACE_AI_API_KEY }}
        BIOTRACE_ANTHROPIC_API_KEY: ${{ secrets.BIOTRACE_ANTHROPIC_API_KEY }}
        BIOTRACE_GEMINI_API_KEY: ${{ secrets.BIOTRACE_GEMINI_API_KEY }}
```

With `ai-enabled: auto`, AI runs if *any* provider in the resolved priority list has a usable key
— not only the primary's.
