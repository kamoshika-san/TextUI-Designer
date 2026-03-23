# HR1 next-epic backlog split

This document converts the HR1 closeout review into a PM/TM-ready backlog split. It keeps Primary hardening, fallback compatibility work, and investigation work in separate families so the next sprint can be chosen without reinterpreting HR1.

## Input

- `docs/hr1-fallback-shrinkage-review.md`
- `docs/html-exporter-primary-fallback-inventory.md`
- `docs/exporter-boundary-guide.md`

## Ticket families

| Family | Goal | Includes | Excludes |
|---|---|---|---|
| Primary parity / hardening | strengthen the default HtmlExporter path as the source of truth | provider/export parity, preview-preparation parity, Primary regression coverage, Primary-only drift fixes | capture-lane replacement, fallback-only obligations |
| Fallback compatibility obligations | keep the explicit compatibility lane reviewable while it still exists | capture entry documentation, fallback-only reason tracking, narrow fallback regressions, guard tightening | generic Primary fixes, broad renderer cleanup |
| Investigation / migration | decide whether one explicit fallback dependency can be removed or must remain | capture-lane replacement spikes, route validation, risk notes, migration blockers | silent production rewrites without prior validation |

## Proposed next backlog

| Order | Candidate | Family | Priority | Suggested owner | Why next |
|---|---|---|---|---|---|
| 1 | Capture lane replacement decision | Investigation / migration | p1 | DEV1 | HR1 proved capture is the remaining explicit runtime fallback entry; this is now the highest-value unresolved route. |
| 2 | Primary sample regression repair / hardening | Primary parity / hardening | p1 | DEV2 | A separate regression already exists around Primary sample markers; fixing or re-baselining it strengthens the actual source-of-truth lane. |
| 3 | Fallback compatibility test pruning | Fallback compatibility obligations | p2 | DEV2 | After capture-lane direction is known, fallback-only tests can be reduced or reclassified instead of drifting as default coverage. |
| 4 | Fallback inventory refresh after capture decision | Fallback compatibility obligations | p2 | DEV1 | Inventory should be updated only after the capture-lane decision so PM/TM do not plan from stale route status. |
| 5 | Full fallback removal review | Investigation / migration | p2 | PM / Architect input first | This is intentionally not the next slice; it depends on the capture route and remaining compatibility needs being re-measured. |

## Sequencing rule

1. Decide the capture lane before attempting broad fallback shrinkage.
2. Keep Primary-path hardening in parallel only when it does not depend on the capture decision.
3. Revisit fallback-only test and inventory cleanup after the explicit runtime fallback story is updated.

## Ownership guidance

- `DEV1` is the better owner for entrypoint and boundary work because HR1-S3 already concentrated helper/guard/review closure there.
- `DEV2` is the better owner for regression and parity hardening because HR1 work already covered route viability and Primary-path sample regression.
- PM/TM should avoid mixing `remove fallback` and `explain fallback` in the same sprint unless the write scope is strictly documentation-only.

## Suggested sprint shapes

### Option A: low-risk next sprint

- `DEV1`: capture lane replacement decision spike
- `DEV2`: Primary sample regression repair / hardening

### Option B: documentation-heavy follow-up sprint

- `DEV1`: fallback inventory refresh after capture decision
- `DEV2`: fallback compatibility test pruning

## Not recommended yet

- A sprint whose goal is full fallback removal.
- A sprint that mixes Primary bug fixing, capture migration, and compatibility cleanup in one developer handoff.
- Reclassifying fallback tests before the capture-lane decision is documented.
