# `renderer/types` Removal Inventory

Updated: 2026-03-27

## Goal

Keep one current-state note for how `renderer/types` is measured after facade removal and what the remaining guard surface means.

## Current State

- Canonical source: `src/domain/dsl-types/`
- Facade file: absent
- `npm run check:dsl-types-ssot` snapshot: `domain/dsl-types imports: 73`, `renderer/types imports: 0`

## What The Metric Means Now

- `renderer/types imports: 0` means the inventory script found no direct import sites that still pull from `renderer/types`.
- The physical compatibility file is already deleted.
- Remaining references to the string `renderer/types` are guard, metrics, and documentation touchpoints only.

## Current Repo Readout

- Entry files use direct `domain/dsl-types` imports.
- Kernel files use direct `domain/dsl-types` imports.
- Preview files use direct `domain/dsl-types` imports.
- Component files use direct `domain/dsl-types` imports.
- No production code path depends on `src/renderer/types.ts`.

## Remaining Touchpoints

### `tests/`

- `tests/unit/renderer-types-thin-facade.test.js`
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`
- `tests/unit/tests-ssot-terminology-guard.test.js`
- `tests/unit/ssot-eslint-restriction-scope.test.js`

These are active guards for "absence stays absent" and "legacy import strings do not reappear".

### `scripts/`

- `scripts/check-dsl-type-imports.cjs`
- `scripts/collect-code-metrics.cjs`
- `scripts/check-ssot-regression-metrics.cjs`

These remain as inventory and CI instrumentation.

## Interpretation

- Renderer-side import migration is complete.
- The compatibility layer is no longer a live production concern.
- Future follow-up should focus on keeping guards and contributor docs aligned, not on additional import rewrites.

## Operating Rule

- New shared DSL type bodies go to `src/domain/dsl-types/`.
- Do not recreate `src/renderer/types.ts`.
- Treat any new `renderer/types` import string as a regression.

## Verification Anchor

- `npm run compile`
- `npm run check:dsl-types-ssot`
- `tests/unit/renderer-types-thin-facade.test.js`
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`
- `tests/unit/ssot-eslint-restriction-scope.test.js`

## Review Cadence

- Use [ssot-monthly-review.md](./ssot-monthly-review.md) as the monthly review procedure for keeping this current-state snapshot aligned with script output and related SSoT docs.
