# General bioinformatics example

A language-agnostic setup for a repository that isn't a single-purpose
RNA-seq or single-cell pipeline: sample metadata, reference FASTA
validation, and read FASTQ validation, without any lineage/claims/figure
tracking. Good starting point for a repo with mixed or exploratory
analyses.

## Expected repository layout

```
data/
  sample_metadata.csv
  <sample>.fq
references/
  genome.fa
```

`fixtures/valid/sequences.fa` and `fixtures/valid/reads.fq` in this
repository show valid FASTA/FASTQ shapes; `fixtures/invalid/` shows what
BioTrace flags (invalid characters, empty records, mismatched
quality/sequence lengths).

## What it checks

- `data/sample_metadata.csv` has `sample_id` and `organism`, with unique
  `sample_id` values.
- Every FASTA file under `references/` uses a restricted DNA alphabet,
  has unique record IDs, no empty sequences, and records of at least 50bp.
- Every FASTQ file under `data/` uses a restricted DNA alphabet, has no
  empty sequences, and is capped at 100,000 records per file (excess is
  reported as an informational finding, not an error).
- A generic environment definition (`requirements.txt`, `pyproject.toml`,
  `DESCRIPTION`, `renv.lock`, or `Dockerfile`) is present; a lockfile is
  not required.

Add `lineage`, `claims`, or `figures` blocks as your repository grows —
see the [bulk-rna-seq](../bulk-rna-seq) example for those.
