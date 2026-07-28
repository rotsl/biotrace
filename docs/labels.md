# Labels Reference

BioTrace creates and manages these labels:

| Label                        | Colour | Purpose                         |
| ---------------------------- | ------ | ------------------------------- |
| `biotrace:checking`          | Blue   | Currently running               |
| `biotrace:passed`            | Green  | All checks passed               |
| `biotrace:warning`           | Amber  | Warnings found                  |
| `biotrace:blocked`           | Red    | Blocking findings               |
| `biotrace:manual-review`     | Purple | Manual review needed            |
| `data:changed`               | Blue   | Data files changed              |
| `data:valid`                 | Green  | Data files validated            |
| `data:invalid`               | Red    | Data validation failed          |
| `data:unexpected-loss`       | Red    | Unexpected data loss            |
| `metadata:valid`             | Green  | Metadata validated              |
| `metadata:warning`           | Amber  | Metadata warnings               |
| `metadata:mismatch`          | Amber  | Metadata value mismatch         |
| `metadata:missing`           | Red    | Required metadata missing       |
| `metadata:duplicate-samples` | Red    | Duplicate IDs detected          |
| `reproducibility:strong`     | Green  | Score ≥ 80                      |
| `reproducibility:partial`    | Amber  | Score 50–79                     |
| `reproducibility:weak`       | Red    | Score < 50                      |
| `reproducibility:regression` | Red    | Score decreased                 |
| `claim:verified`             | Green  | Claim verified                  |
| `claim:stale`                | Amber  | Claim may be stale              |
| `claim:unsupported`          | Red    | Claim unsupported               |
| `claim:manual-review`        | Purple | Claim needs review              |
| `results:verified`           | Green  | Results traceable               |
| `results:changed`            | Blue   | Results changed                 |
| `results:untraceable`        | Amber  | Results untraceable             |
| `figure:verified`            | Green  | Figure provenance verified      |
| `figure:stale`               | Amber  | Figure may be stale             |
| `figure:missing`             | Red    | Figure missing                  |
| `figure:provenance-missing`  | Amber  | Provenance missing              |
| `ai:reviewed`                | Purple | AI observations provided        |
| `ai:suggestion`              | Purple | AI suggestion                   |
| `ai:unavailable`             | Amber  | AI unavailable (non-blocking)   |
| `ai:manual-verification`     | Purple | AI suggests manual verification |

Exclusive label groups ensure only one overall status and one reproducibility
label remain at a time.

## Customising label colours

The `labels.colours` config block lets you override the colour used for each
of five categories (not individual labels):

```yaml
labels:
  create: true
  prefix: ""
  colours:
    passed: "1f883d"
    warning: "bf8700"
    blocked: "d1242f"
    informational: "0969da"
    ai: "8250df"
```

Every label above falls into exactly one of those five categories based on
its default colour.
