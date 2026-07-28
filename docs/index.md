# BioTrace

**Trace biological results from data and code to figures and scientific claims.**

BioTrace is a GitHub Action for computational-biology repositories that checks
whether scientific artefacts remain traceable across the entire analysis chain:

```
Input data → Biological metadata → Analysis code → Statistical results → Figures and tables → Written scientific claims
```

!!! warning "Disclaimer"
    BioTrace checks traceability and configured evidence. It does not
    establish biological truth. It does not replace scientific,
    statistical, ethical, clinical, or peer review.

## Why BioTrace?

Consider this common scenario:

```
Analysis changed. ✏️
Result table changed. ✏️
Figure did not change. ❌
Manuscript still contains the old result. ❌
```

BioTrace detects this class of problems automatically, on every pull request,
before reviewers spend time on stale results.

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

## Supported formats

| Format                                       | Validation       | Streaming |
| -------------------------------------------- | ---------------- | --------- |
| CSV                                          | ✅ Full          | N/A       |
| TSV                                          | ✅ Full          | N/A       |
| FASTA                                        | ✅ Full          | ✅        |
| FASTQ                                        | ✅ Full          | ✅        |
| Figure provenance sidecar (`.biotrace.json`) | ✅ Schema + hash | N/A       |
| H5AD                                         | ❌ Future        | —         |

## Limitations

- BioTrace **does not execute** analysis code — it checks traceability statically
- H5AD validation is **not yet implemented** (planned for future release)
- R session information checking is **not yet implemented**
- AI observations are **advisory only** and may contain errors
- BioTrace does **not** verify biological or clinical correctness
- Very large files are **skipped** with size limits (configurable)
- Git commit-graph provenance comparisons are **approximate** for rebased branches

Ready to try it? Head to [Quick Start](quick-start.md).
