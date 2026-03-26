# `src/renderer/types.ts` Direct-Import Inventory

Updated: 2026-03-27

## Goal

Keep one current-state note for how `renderer/types` is measured, what `renderer/types imports: 0` means, and why the facade file can still exist at the same time.

## Current State

- Canonical source: `src/domain/dsl-types/`
- Facade file: `src/renderer/types.ts`
- Facade shape: `export * from '../domain/dsl-types';`
- `npm run check:dsl-types-ssot` snapshot: `domain/dsl-types imports: 74`, `renderer/types imports: 0`

## What The Metric Means

- `renderer/types imports: 0` means the inventory script found no direct import sites that still pull from `renderer/types`.
- It does not mean the physical file has been deleted.
- It does not override ADR 0003, which treats facade deletion as a separate future decision.

## Why The Count Changed

- Earlier snapshots were taken before the renderer kernel, preview, and component direct-import follow-up slices landed.
- The current count is higher on `domain/dsl-types` because those renderer-local files now import the canonical module directly.
- The zero on `renderer/types` is therefore a migration result, not proof that the compatibility file should be removed in the same step.

## Current Repo Readout

- Entry files already use direct `domain/dsl-types` imports.
- Kernel files already use direct `domain/dsl-types` imports.
- Preview follow-up files already use direct `domain/dsl-types` imports.
- Component follow-up files already use direct `domain/dsl-types` imports.
- `src/renderer/types.ts` remains as a thin facade only.

## Repo-Wide Inventory Buckets

### `src/`

- Direct `renderer/types` imports are already `0`.
- The only production-code touchpoint left is the facade file itself: `src/renderer/types.ts`.
- Renderer migration work for `entry`, `kernel`, `preview`, and `components` is therefore historical closeout, not current implementation backlog.

### `tests/`

- `tests/unit/renderer-types-thin-facade.test.js`
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`
- `tests/unit/tests-ssot-terminology-guard.test.js`

These are not residual import edges. They are the active guard surface that proves the facade stays thin and that direct backflow does not reappear.

### `scripts/`

- `scripts/check-dsl-type-imports.cjs`
- `scripts/collect-code-metrics.cjs`
- `scripts/check-ssot-regression-metrics.cjs`

These are measurement and CI touchpoints, not migration blockers. They remain because A2/A3 still need inventory and metrics after the physical facade-removal decision.

## Recommended Migration Order

1. `entry`
2. `kernel`
3. `preview`
4. `components`
5. `tests/scripts`

## Current Interpretation Of That Order

- The first four lanes are already complete in the current repo state.
- The next actionable work is therefore not another renderer import rewrite.
- A2 should treat `tests/scripts` preparation and deletion-readiness work as the remaining path, then hand off to A3 for physical facade removal.

## Operating Rule

- New shared DSL type bodies go to `src/domain/dsl-types/`.
- Do not add type bodies, aliases, or logic to `src/renderer/types.ts`.
- Treat any future deletion of `src/renderer/types.ts` as a dedicated ticket with explicit migration and compatibility review.

## Verification Anchor

- `npm run check:dsl-types-ssot`
- `tests/unit/renderer-types-thin-facade.test.js`
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`
- `tests/unit/non-renderer-ssot-meta-guard.test.js`
- `tests/unit/ssot-eslint-restriction-scope.test.js`

## Historical Note

- If you need the older pre-follow-up snapshots, consult git history rather than treating older counts in downstream docs as the current source of truth.
