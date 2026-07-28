# Contributing to BioTrace

Thanks for your interest in improving BioTrace. This document covers local
development setup, the project layout, and what's expected of a pull request.

## Development setup

Requires Node.js 20.x and npm 10.x+.

```bash
git clone https://github.com/rotsl/biotrace.git
cd biotrace
npm ci
```

## Project layout

```
src/
  ai/              Optional AI provider adapters, prompt building, sanitisation
  config/          Config schema (Zod), defaults, loading/merging
  github/          Octokit client, labels, comments, annotations, permissions
  reporting/       Finding model, JSON report, Markdown/PR comment rendering
  reproducibility/ Environment/lockfile/seed/container detection, scoring
  security/        Path traversal protection, secret redaction, size limits
  utils/           CSV parsing, file I/O, hashing, logging, pattern matching
  validators/      Metadata, FASTA, FASTQ, lineage, claims, figure provenance
  inputs.ts        Reads and validates action.yml inputs
  main.ts          Action entrypoint
  run.ts           Orchestrates validators -> scoring -> report -> GitHub I/O
tests/unit/        Vitest unit tests, one file per module family
schemas/           JSON Schemas for the config file and the JSON report
fixtures/          Sample valid/invalid data files for manual testing
examples/          End-to-end example configs + workflows for common setups
```

## Making a change

1. Create a branch from `main`.
2. Make your change. Keep it scoped — one concern per PR.
3. Add or update tests in `tests/unit/` for any behaviour change.
4. Run the full validation suite before opening a PR:

   ```bash
   npm run all
   ```

   This runs, in order: format check, lint, typecheck, tests with coverage,
   build, and a check that `dist/index.js` matches the source. All of these
   must pass.

5. If you changed anything under `src/`, rebuild and commit `dist/index.js`:

   ```bash
   npm run build
   git add dist/index.js
   ```

   `dist/index.js` **must** be committed — GitHub Actions runs the built
   file, not the TypeScript source. A stale `dist/` will fail CI's
   `check-dist` step.

## Code style

- Formatting is enforced by Prettier (`npm run format` to fix, `npm run
format:check` to verify).
- Linting is enforced by ESLint (`npm run lint`).
- TypeScript runs in `strict` mode with `noUnusedLocals` and
  `noUnusedParameters` — the build fails on unused imports/variables, not
  just lint.
- No untrusted code execution: BioTrace validates files statically. Do not
  add code paths that `eval`, `require()` a path derived from repository
  content, or shell out to interpreters against untrusted input.
- All file paths must be resolved through `src/security/paths.ts` /
  `src/utils/files.ts` helpers (`safeReadFile`, `safeFileExists`,
  `isPathSafe`) rather than raw `fs` calls, so path-traversal protection
  stays centralised.

## Testing

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:coverage # with coverage thresholds enforced
```

Coverage thresholds (statements/branches/functions/lines) are enforced in
`vitest.config.ts`. New code should come with tests that exercise it.

## Adding a new validator or config field

1. Add the field to `src/config/types.ts` and `src/config/schema.ts` (Zod).
2. Update `schemas/biotrace-config.schema.json` to match, and run
   `npm run validate:schemas`.
3. Implement the validator under `src/validators/`, returning `Finding[]`
   via `createFinding()` from `src/reporting/findings.ts`.
4. Wire it into `src/run.ts`.
5. Document the field in `README.md`'s Configuration Reference.
6. Add unit tests under `tests/unit/`.

## Reporting bugs / requesting features

Open a GitHub issue using the templates under `.github/ISSUE_TEMPLATE/`.
For security issues, see [SECURITY.md](SECURITY.md) instead of opening a
public issue.

## Pull request checklist

- [ ] `npm run all` passes locally
- [ ] `dist/index.js` rebuilt and committed if `src/` changed
- [ ] Tests added/updated for the behaviour change
- [ ] README updated if configuration, inputs, outputs, or labels changed
- [ ] No API keys, tokens, or other secrets in the diff
