# Bulk RNA-seq example

A realistic setup for an R-based differential-expression workflow: sample
metadata validation, lineage tracing from raw counts through to a figure
and a manuscript claim, figure provenance, a numerical claim check against
`results/de_results.csv`, and reproducibility scoring for an `renv`-managed
R project. Optional AI observations are enabled (bring your own key).

## Expected repository layout

```
data/
  counts.csv
  sample_metadata.csv
analysis/
  differential_expression.R
  figure_2.R
results/
  de_results.csv
figures/
  figure_2.png
  figure_2.png.biotrace.json
manuscript/
  results.md      # contains a "BIOTRACE:il6-treatment-effect" marker
  figures.md       # contains a "figure-2" marker
renv.lock
```

`fixtures/valid/sample_metadata.csv` and `fixtures/valid/de_results.csv`
in this repository show the expected shape of those two files.

## What it checks

- **Metadata**: `sample_id`/`condition`/`biological_replicate` present,
  `sample_id` unique, `condition` restricted to `control`/`treatment`,
  each condition group has at least 3 replicates (warning if not).
- **Lineage**: if `data/counts.csv` or the metadata changes without
  `results/de_results.csv` or `figures/figure_2.png` also changing, that's
  flagged as a possible stale output (blocking, since
  `stale_output_severity: error`).
- **Claim**: the `IL6` row in `results/de_results.csv` must have
  `log2FoldChange >= 1.7` and `padj < 0.01` for the
  `BIOTRACE:il6-treatment-effect` claim in `manuscript/results.md` to be
  marked verified.
- **Figure provenance**: `figures/figure_2.png` requires a
  `figures/figure_2.png.biotrace.json` sidecar recording the input/
  environment hashes it was generated from.
- **Reproducibility**: `renv.lock` present, the documented entrypoint
  (`Rscript analysis/differential_expression.R`) exists, and
  `set.seed(` appears somewhere in the entrypoint.

## AI (optional)

This example enables `ai-enabled: auto`, which only activates when
`BIOTRACE_AI_API_KEY` is set as a repository secret and
`BIOTRACE_AI_MODEL` as a repository variable. On fork pull requests, or
when the secret isn't configured, BioTrace automatically skips AI and
still runs every deterministic check above.
