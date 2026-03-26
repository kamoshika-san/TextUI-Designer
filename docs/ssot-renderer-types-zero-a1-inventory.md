# SSoT renderer/types Zeroization A1 Inventory

Updated: 2026-03-27

## Goal

Record the final repo-wide inventory for Epic A Sprint A1 and turn the old "remaining renderer migration" question into a concrete A2/A3 execution order.

## Snapshot

- Command: `npm run check:dsl-types-ssot`
- Result: `domain/dsl-types imports: 74`, `renderer/types imports: 0`
- Facade file still present: `src/renderer/types.ts`
- Facade shape: `export * from '../domain/dsl-types';`

## What Is Already Drained

| Lane | State | Evidence |
|---|---|---|
| entry | complete | `webview.tsx`, `use-webview-messages.ts` already import `domain/dsl-types` directly |
| kernel | complete | `component-map.tsx`, `registered-component-kernel.tsx` already import `domain/dsl-types` directly |
| preview | complete | `preview-built-in-renderers.tsx`, `preview-diff.ts` already import `domain/dsl-types` directly |
| components | complete | current `src/renderer/components/*` shared-contract users already import `../domain/dsl-types` directly |

## Remaining Touchpoints

### Production Code

- `src/renderer/types.ts`

This is the only remaining first-party code artifact in the old lane, and it is already constrained to thin-facade shape.

### Guard Tests

- `tests/unit/renderer-types-thin-facade.test.js`
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`
- `tests/unit/tests-ssot-terminology-guard.test.js`

These remain intentionally. They enforce the zero-backflow state and protect against accidental reuse during A2/A3.

### Metrics / CI Scripts

- `scripts/check-dsl-type-imports.cjs`
- `scripts/collect-code-metrics.cjs`
- `scripts/check-ssot-regression-metrics.cjs`

These remain intentionally as measurement and regression tooling. They are not residual migration debt by themselves.

## A2 / A3 Execution Order

1. entry
2. kernel
3. preview
4. components
5. tests/scripts
6. physical facade removal
7. lint / boundary cleanup
8. ADR closeout

## Current Meaning For PM

- Steps 1 through 4 are already complete history.
- The next real implementation lane is not another import rewrite inside `src/renderer/**`.
- The remaining backlog should be framed as:
  - A2: guard and regression preparation around an already-drained import graph
  - A3: file deletion, boundary cleanup, and ADR closure

## Verification Anchor

- `npm run check:dsl-types-ssot`
- `docs/dsl-types-renderer-types-inventory.md`
- `docs/ssot-renderer-facade-sprint3-decision.md`
- `docs/adr/0003-dsl-types-canonical-source.md`
