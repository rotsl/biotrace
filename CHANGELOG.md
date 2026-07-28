# Changelog

All notable changes to BioTrace are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-07-28

### Added

- Metadata (CSV/TSV) validation: required columns, non-null constraints,
  uniqueness, allowed values, minimum group size.
- Streaming FASTA validation: alphabet checks, duplicate IDs, empty
  sequences/IDs, length limits.
- Streaming FASTQ validation: 4-line record structure, quality/sequence
  length matching, truncated-record detection.
- Lineage tracing between inputs, code, outputs, environment, and claims,
  with configurable severities.
- Numerical claim verification against CSV/TSV evidence files, with
  `==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `not_in`, `matches` operators.
- Figure provenance via `.biotrace.json` sidecars with SHA-256 input/
  environment hash verification.
- Transparent, weighted reproducibility scoring (0-100) with Python/R
  environment, lockfile, dependency-constraint, seed, entrypoint, and
  container detection.
- Auto-managed, namespaced, exclusive-group PR labels.
- A single persistent, update-in-place PR comment plus a step summary.
- JSON report output (`schemas/biotrace-report.schema.json`).
- Optional, bring-your-own-key AI-assisted observations via an
  OpenAI-compatible provider, advisory-only and never affecting
  deterministic checks or the reproducibility score.
- Security model: path traversal and symlink escape protection, secret
  redaction before display or AI transmission, no execution of untrusted
  repository code, graceful degradation on missing write permissions,
  fork-PR-safe (AI automatically skipped when secrets are unavailable).

[Unreleased]: https://github.com/rotsl/biotrace/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/rotsl/biotrace/releases/tag/v1.0.0
