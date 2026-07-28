# Minimal example

The smallest useful BioTrace setup: one metadata table, no AI, no lineage,
no claims. This is the same configuration used in the README's
10-Minute Quick Start.

## What it checks

- `data/sample_metadata.csv` has `sample_id` and `condition` columns.
- `sample_id` values are unique.
- `condition` only contains `control` or `treatment`.

## Using this example

Copy `.github/biotrace.yml` and `.github/workflows/biotrace.yml` into your
repository, then adjust `path`, `required_columns`, `unique`, and
`allowed_values` to match your own metadata table. See the README's
[Configuration Reference](../../README.md#configuration-reference) for
every available field.
