# SSoT Import Guard Matrix

Updated: 2026-03-26

## Goal

State which mechanism detects which kind of `renderer/types` backflow so the boundary is not enforced by review alone.

## Guard Matrix

| Mechanism | What it detects | Current scope | Result on 2026-03-26 | Notes |
|---|---|---|---|---|
| `npm run check:dsl-types-ssot` | Inventory of `domain/dsl-types` imports and any `renderer/types` backflow outside allowed renderer usage | Whole repo via `scripts/check-dsl-type-imports.cjs` | `domain/dsl-types imports: 47`, `renderer/types imports: 0` | Best current snapshot source for PM/TM and inventory docs |
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

## Known Gaps

- Renderer-internal usage is intentionally not treated as a Sprint 3 violation; it is tracked as migration inventory instead.
- The current guards prevent backflow but do not decide facade removal timing.
- If renderer directories move, the meta guard and inventory script must move with them.

## Expected Violation Patterns

| Violation | First detector | Follow-up |
|---|---|---|
| New non-renderer `renderer/types` import | `renderer-types-non-renderer-import-guard` or `check:dsl-types-ssot` | Change import to `domain/dsl-types` and rerun focused guards |
| New shared type body added to `src/renderer/types.ts` | `renderer-types-thin-facade.test.js` | Move the type to `src/domain/dsl-types/` or a true renderer-local file |
| Scope drift in lint restriction | `ssot-eslint-restriction-scope.test.js` | Restore the intended lint scope before merge |
| Renderer-only facade churn | Inventory docs plus renderer planning review | Route through Sprint 3/Sprint 4 renderer shrinkage planning |
