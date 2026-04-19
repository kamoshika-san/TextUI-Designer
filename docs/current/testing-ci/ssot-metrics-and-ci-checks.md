# SSoT Metrics And CI Checks

Updated: 2026-03-28
Owner: Maintainer
Audience: Maintainer, Reviewer, PM
Review cadence: per change

## Goal

Explain what `npm run metrics:collect` and `npm run metrics:check:ssot` emit, and how CI should read the current SSoT gate results.

## Scripts

| npm script | command | purpose |
| --- | --- | --- |
| `metrics:collect` | `node ./scripts/collect-code-metrics.cjs` | writes `metrics/code-metrics.json` and `metrics/code-metrics.md` with repo line counts, `renderer/types` SSoT metrics, and CSS SSoT baseline metrics |
| `metrics:check:ssot` | `node ./scripts/check-ssot-regression-metrics.cjs` | reads the `ssot` block from `metrics/code-metrics.json` and returns PASS / FAIL by comparing current values against the approved threshold or baseline |

Run them in this order:

```bash
npm run metrics:collect
npm run metrics:check:ssot
```

## Current Gate Surface

`metrics:check:ssot` currently evaluates four checks:

1. `renderer/types` imports outside the allowed renderer lane
2. CSS `TODO partial` markers in the approved component CSS migration scope
3. approved narrow inline utility `className` occurrences in the target built-in renderer components
4. fallback compatibility selectors in `src/exporters/html-template-builder.ts`

The current approved CSS baseline is:

| metric | baseline |
| --- | ---: |
| `TODO partial count` | `0` |
| `Non-exempt inline utility class occurrences` | `6` |
| `Fallback compatibility selector count` | `24` |

`renderer/types` keeps the existing threshold rule:

| metric | threshold |
| --- | ---: |
| `renderer/types imports` | `0` |

## Example Output

```text
[ssot-metrics] renderer/types imports: threshold=0, current=0, status=PASS
[ssot-metrics] css TODO partial count: baseline=0, current=0, status=PASS
[ssot-metrics] css inline utility class occurrences: baseline=6, current=6, status=PASS
[ssot-metrics] css fallback compatibility selector count: baseline=24, current=24, status=PASS
[ssot-metrics] overall status=PASS
```

Interpretation:

- `renderer/types imports` fails if current exceeds the configured threshold.
- each CSS metric fails if current exceeds the approved baseline.
- `overall status` is `PASS` only when every check passes.

## Generated Files

| file | contents |
| --- | --- |
| `metrics/code-metrics.json` | machine-readable summary, including `ssot.threshold`, `rendererTypesImports`, `violatingFiles`, `cssThresholds`, `cssMetrics`, `cssViolations`, and `status` |
| `metrics/code-metrics.md` | human-readable summary for CI job output and review evidence |

`metrics/` remains ignored by git.

## CI Use

The `Code metrics` CI job should:

1. run `npm run metrics:collect`
2. run `npm run metrics:check:ssot`
3. publish `metrics/code-metrics.md` to the job summary
4. upload `metrics/` as an artifact when review evidence is needed

Treat `metrics:check:ssot` as a gate. A failing result means the branch or release candidate is not ready to merge until the drift is removed or explicitly reticketed.

## Relationship To `check:dsl-types-ssot`

`check:dsl-types-ssot` and `metrics:check:ssot` are related but different:

| command | primary use |
| --- | --- |
| `npm run check:dsl-types-ssot` | focused diagnosis of import-path violations and import counts |
| `npm run metrics:check:ssot` | gate-oriented threshold / baseline enforcement for the current approved SSoT metric surface |

Use the focused checks when triaging. Use `metrics:check:ssot` when deciding whether the branch passes the gate.

## Troubleshooting

| symptom | action |
| --- | --- |
| `metrics/code-metrics.json was not found` | run `npm run metrics:collect` first |
| `renderer/types` check fails | remove the non-renderer import and route it through the approved shared path |
| CSS metric fails | inspect the reported details, reduce the drift, and record the affected metric in the review handoff if the change is intentional but still within ticket scope |
