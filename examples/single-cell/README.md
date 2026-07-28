# Single-cell example

A Python/`scanpy`-style single-cell RNA-seq setup: cell/sample metadata,
raw FASTQ validation, and reproducibility checks tuned for a
`requirements.txt` + lockfile Python project with a documented clustering
entrypoint and a fixed random seed.

## Expected repository layout

```
data/
  sample_metadata.csv
  raw/
    <sample>_R1.fq
    <sample>_R2.fq
analysis/
  cluster.py
requirements.txt
poetry.lock        # or uv.lock / conda-lock.yml / Pipfile.lock
```

## What it checks

- `data/sample_metadata.csv` has `sample_id`, `condition`, `tissue`, with
  unique, non-null `sample_id`/`condition`.
- Raw FASTQ files under `data/raw/` use a restricted DNA alphabet and
  reject empty sequences.
- A Python environment definition and lockfile are both present, the
  `python analysis/cluster.py` entrypoint exists, and one of
  `random_state=`, `numpy.random.seed(`, or `default_rng(` appears in it.

## H5AD

> **Not yet supported.** BioTrace does not currently validate `.h5ad`
> files (see the README's Limitations/Roadmap). This example's `ai.never_send`
> list excludes `**/*.h5ad` and `**/*.loom` so that, if you enable AI
> observations later, those binary matrices are never sent to the
> provider even though BioTrace can't validate their contents yet.
