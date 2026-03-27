# SSoT Import Guard Matrix

Updated: 2026-03-27

## Goal

State which mechanism detects which kind of `renderer/types` backflow so the boundary is not enforced by review alone.

## Current Snapshot

- `npm run check:dsl-types-ssot`
- Result: `domain/dsl-types imports: 74`, `renderer/types imports: 0`
- Current repo state already includes the entry, kernel, preview, and component direct-import follow-up slices.

## Guard Matrix

| Mechanism | What it detects | Current scope | Result on 2026-03-27 | Notes |
|---|---|---|---|---|
| `npm run check:dsl-types-ssot` | Inventory of `domain/dsl-types` imports and any `renderer/types` backflow outside allowed renderer usage | Whole repo via `scripts/check-dsl-type-imports.cjs` | `domain/dsl-types imports: 74`, `renderer/types imports: 0` | Best current snapshot source for PM/TM and inventory docs |
| `tests/unit/renderer-types-thin-facade.test.js` | `src/renderer/types.ts` stays re-export only | Thin facade file only | pass | Guards against adding type bodies, aliases, or logic to facade |
| `tests/unit/renderer-types-non-renderer-import-guard.test.js` | `renderer/types` import from non-renderer code and tests | `src/renderer/**` outside + `tests/**` | pass | Zero-tolerance guard for direct backflow |
| `tests/unit/non-renderer-ssot-meta-guard.test.js` | Layer-wide residual `renderer/types` imports | `core/cli/utils/services/types/exporters/registry` | pass | Aggregated meta guard across major non-renderer layers |
| `tests/unit/ssot-eslint-restriction-scope.test.js` | ESLint restriction remains configured as intended | ESLint config itself | pass | Detects scope drift in the lint rule, not runtime imports directly |
| ESLint `no-restricted-imports` | New `renderer/types` imports in greenfield layers | `src/domain/**`, `src/services/**`, `src/components/**` | configured | Prevents new violations in the primary contributor lanes |

## Coverage Summary

- Thin facade shape is mechanically fixed.
- Non-renderer direct backflow is mechanically fixed in both script and unit tests.
- Greenfield layers have lint prevention before review.
- Inventory and enforcement remain connected: the same repo state is visible in docs, scripts, and tests.

## Current Interpretation

- Renderer-internal migration is no longer an active component-batching problem; that lane has already been drained.
- The remaining decision surface is facade timing, not backflow detection.
- The current guards still do not decide when physical facade deletion should happen; they only guarantee boundary behavior and thin-facade shape.

## Review Cadence

- Monthly review procedure: [ssot-monthly-review.md](./ssot-monthly-review.md)
- During that review, treat this matrix as the current guard-state source and refresh its snapshot whenever command output changes.

## Expected Violation Patterns

| Violation | First detector | Follow-up |
|---|---|---|
| New non-renderer `renderer/types` import | `renderer-types-non-renderer-import-guard` or `check:dsl-types-ssot` | Change import to `domain/dsl-types` and rerun focused guards |
| New shared type body added to `src/renderer/types.ts` | `renderer-types-thin-facade.test.js` | Move the type to `src/domain/dsl-types/` or a true renderer-local file |
| Scope drift in lint restriction | `ssot-eslint-restriction-scope.test.js` | Restore the intended lint scope before merge |
| Future facade-removal proposal | Inventory docs plus ADR / maintainer guidance review | Route through a dedicated backlog slice instead of treating it as routine cleanup |
