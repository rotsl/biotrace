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
- User-facing documentation site (`docs/`, built with MkDocs Material),
  published to GitHub Pages via a manually-triggered "Deploy docs"
  workflow.

### Fixed

- `escMd()` (Markdown escaping for PR comments) now escapes backslashes
  before escaping backticks/asterisks, so a leading backslash in a
  finding or claim message can no longer neutralise the following escape
  and open an unintended code span in the posted comment.
- Symlink-escape protection in `safeReadFile`/`safeFileExists` was dead
  code (checked `isSymbolicLink()` on a `statSync` result, which always
  follows symlinks); now uses `lstatSync` plus a realpath comparison so
  it actually rejects symlinks that resolve outside the workspace.
- FASTA/FASTQ glob matching was resolving against `process.cwd()`
  instead of the configured workspace.
- Coverage thresholds (statements/branches/functions/lines) were declared
  in a shape Vitest silently ignored, so `npm run test:coverage` always
  passed regardless of actual coverage.
- Label colour overrides (`labels.colours`) were never applied — the
  code looked up colours by full label name instead of by category.

### Changed

- Dropped the `@actions/glob` dependency; FASTA/FASTQ glob matching now
  uses Node's built-in `fs.promises.glob()`. This removes a
  brace-expansion/minimatch advisory that had no fix compatible with the
  project's bundler (see below) and raises the minimum Node version to 22.
- Upgraded `zod` 3→4, `js-yaml` 4→5, `eslint` 9→10, `vitest`/
  `@vitest/coverage-v8` 2→4, `typescript` 5→6, `@types/node` 20→26,
  `globals` 15→17, and `@vercel/ncc` 0.38→0.44.
- `@actions/core` and `@actions/github` stay pinned to `^1.10.1`/`^6.0.0`:
  their current majors ship pure ESM only, which `@vercel/ncc` (the
  bundler producing the committed `dist/index.js`) cannot resolve. Newer
  `ncc` versions don't fail the build on this — they silently substitute
  a stub that only throws once the affected code path runs, so a green
  `npm run build`/test suite doesn't guarantee a working bundle. See
  `INSTRUCTIONS.md` for how to verify (`grep webpackMissingModule
dist/index.js`).
- CI's Node version bumped from 20 to 22 to match the `fs.promises.glob`
  requirement above.

[Unreleased]: https://github.com/rotsl/biotrace/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/rotsl/biotrace/releases/tag/v1.0.0
