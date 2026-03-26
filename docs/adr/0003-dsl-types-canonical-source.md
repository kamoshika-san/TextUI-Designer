# ADR 0003: DSL canonical source after `renderer/types` removal

## Status

Accepted and closed on 2026-03-27.

## Context

- Shared DSL types had historically existed in both `src/domain/dsl-types/` and `src/renderer/types.ts`.
- The repo then converged on `src/domain/dsl-types/` as the canonical source and reduced `src/renderer/types.ts` to a thin facade.
- Epic A completed the final removal step after direct imports and guard preparation were already green.

## Decision

1. The canonical source for shared DSL types is `src/domain/dsl-types/` via its public `index.ts`.
2. `src/renderer/types.ts` is deleted and must not be recreated as a compatibility layer.
3. New and existing shared-type imports must use `domain/dsl-types`; `renderer/types` is treated as a legacy path string that should remain absent from production code.
4. Boundary enforcement remains in place through:
   - `npm run check:dsl-types-ssot`
   - `tests/unit/renderer-types-thin-facade.test.js`
   - `tests/unit/renderer-types-non-renderer-import-guard.test.js`
   - `tests/unit/ssot-eslint-restriction-scope.test.js`

## Deletion Conditions Closure

The previously stated deletion conditions are now satisfied:

1. `renderer/types` direct imports are `0`.
2. WebView, preview, exporter, and non-renderer lanes build and test against `domain/dsl-types` directly.
3. Guard and regression lanes pass with the facade file absent.

Observed closeout snapshot on 2026-03-27:

- `npm run compile`: pass
- `npm run check:dsl-types-ssot`: `domain/dsl-types imports: 73`, `renderer/types imports: 0`
- Focused guard suite: pass
- A2-3 regression baseline remained green before deletion, and A3 verification stayed green after deletion.

## Consequences

- `renderer/types` is no longer part of the supported architecture.
- Documentation and contributor guidance should describe `domain/dsl-types` as the only shared DSL type entrypoint.
- Any future renderer-local type surface should be introduced as a truly renderer-local module, not as a new shared facade.

## Related

- [dsl-types-renderer-types-inventory.md](../dsl-types-renderer-types-inventory.md)
- [ssot-renderer-types-zero-metrics-dashboard.md](../ssot-renderer-types-zero-metrics-dashboard.md)
- [ssot-import-guard-matrix.md](../ssot-import-guard-matrix.md)
