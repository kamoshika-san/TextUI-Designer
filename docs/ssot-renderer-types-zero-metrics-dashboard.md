# SSoT renderer/types Zeroization Metrics Dashboard

Updated: 2026-03-27

## Goal

Keep one current Epic A baseline note for `metrics:collect` and `metrics:check:ssot` so A2/A3 can compare against a fixed snapshot.

## Commands

```bash
npm run metrics:collect
npm run metrics:check:ssot
```

## Current Result

- Generated at: `2026-03-26T21:50:23.916Z`
- `renderer/types` threshold: `0`
- `renderer/types imports`: `0`
- status: `PASS`

## Current Size Snapshot

| Metric | Value |
|---|---:|
| files | 457 |
| total lines | 49524 |
| non-empty lines | 43129 |
| `src/typescript` files | 250 |
| `src/tsx` files | 31 |
| `tests` files | 163 |
| `scripts` files | 13 |

## Segment Snapshot

| Segment | Files | Total lines |
|---|---:|---:|
| `src/services` | 82 | 8497 |
| `src/exporters` | 36 | 4355 |
| `src/cli` | 41 | 3489 |
| `src/utils` | 19 | 3329 |
| `src/renderer` | 40 | 2887 |
| `tests` | 163 | 20266 |
| `scripts` | 13 | 1618 |

## Interpretation

- The SSoT regression threshold is already at the target `0`.
- The next meaningful comparison is not whether import backflow still exists, but whether facade-removal preparation and deletion preserve this `PASS` state.
- Re-run the two commands after A2 and A3, then compare against this note.

## Related

- [ssot-metrics-and-ci-checks.md](./ssot-metrics-and-ci-checks.md)
- [dsl-types-change-impact-audit.md](./dsl-types-change-impact-audit.md)
- [dsl-types-renderer-types-inventory.md](./dsl-types-renderer-types-inventory.md)
