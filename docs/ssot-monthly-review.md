# SSoT Monthly Review

Updated: 2026-03-27

## Goal

Run one lightweight monthly review that confirms the current SSoT state is still true and that stale snapshots in docs are either refreshed or explicitly marked historical.

## Canonical Inputs

Review these in order and treat them as the source set for the monthly check:

1. `npm run check:dsl-types-ssot`
2. `npm run metrics:collect`
3. `npm run metrics:check:ssot`
4. [dsl-types-renderer-types-inventory.md](./dsl-types-renderer-types-inventory.md)
5. [ssot-import-guard-matrix.md](./ssot-import-guard-matrix.md)
6. [ssot-metrics-and-ci-checks.md](./ssot-metrics-and-ci-checks.md)

## Monthly Procedure

1. Run `npm run check:dsl-types-ssot` and record the current `domain/dsl-types` and `renderer/types` counts.
2. Run `npm run metrics:collect` and `npm run metrics:check:ssot` and confirm `threshold=0` and `status=PASS`.
3. Compare those results against the current-state sections in the three SSoT docs above.
4. If a doc shows a current snapshot that no longer matches command output, update it in the same slice.
5. If a doc is intentionally historical, label it as historical rather than leaving an outdated current-state claim in place.
6. Confirm the related PR / maintainer guidance still points contributors to the same checks and follow-up path.

## Stale Snapshot Rule

- A doc may contain old numbers only when the section is explicitly framed as a historical baseline, closeout snapshot, or decision record.
- A doc must not present stale output as the current repo state.
- When current state changes, update the inventory, guard, and metrics docs together or note why one of them is intentionally historical.

## Minimum Review Output

Record these four facts in the review note or ticket handoff:

- `npm run check:dsl-types-ssot` result
- `npm run metrics:check:ssot` result
- which docs were confirmed current
- whether any historical notes were intentionally left unchanged

## Current 2026-03-27 Baseline

- `npm run check:dsl-types-ssot`: `domain/dsl-types imports: 73`, `renderer/types imports: 0`
- `npm run metrics:check:ssot`: `threshold=0`, `status=PASS`
- `src/renderer/types.ts`: absent

## Related

- [MAINTAINER_GUIDE.md](./MAINTAINER_GUIDE.md)
- [dsl-types-change-impact-audit.md](./dsl-types-change-impact-audit.md)
- [ssot-exception-log-rules.md](./ssot-exception-log-rules.md)
