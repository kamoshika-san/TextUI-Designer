# SSoT renderer/types Zeroization Metrics Dashboard

Updated: 2026-03-27

## Goal

Keep one current Epic A note for the last green baseline before deletion and the first green snapshot after deletion.

## Commands

```bash
npm run metrics:collect
npm run metrics:check:ssot
```

## Current Result

- `renderer/types` threshold: `0`
- `renderer/types imports`: `0`
- status: `PASS`

## A2 Baseline Before Deletion

- `npm run pretest:ci`: `PASS`
- `npm run test:unit`: `560 passing`
- `npm run test:integration`: `15 passing`
- `npm run test:e2e`: `10 passing`
- `npm run test:regression`: `21 passing`

## A3 Closeout Snapshot After Deletion

- `npm run compile`: `PASS`
- `npm run check:dsl-types-ssot`: `domain/dsl-types imports: 73`, `renderer/types imports: 0`
- focused guard suite: `PASS`
- `npm run metrics:check:ssot`: `PASS`

## Interpretation

- The repo reached and preserved the target state with the physical facade removed.
- The important regression signal is now whether `renderer/types imports` stays at `0`, not whether a thin facade still exists.
- Epic A can treat this as the closeout metrics reference for A3.

## Related

- [ssot-metrics-and-ci-checks.md](./ssot-metrics-and-ci-checks.md)
- [dsl-types-renderer-types-inventory.md](./dsl-types-renderer-types-inventory.md)
- [adr/0003-dsl-types-canonical-source.md](./adr/0003-dsl-types-canonical-source.md)
