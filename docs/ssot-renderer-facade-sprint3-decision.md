# SSoT Renderer Facade Post-Components Assessment

Updated: 2026-03-27

## Decision

Keep `src/renderer/types.ts` as a thin facade for now. Do not open a facade-deletion code slice yet.

## Current Evidence

- `npm run check:dsl-types-ssot` now reports `domain/dsl-types imports: 74` and `renderer/types imports: 0`.
- Entry, kernel, preview, and component follow-up slices have already moved to direct `domain/dsl-types` imports.
- `src/renderer/types.ts` still contains only `export * from '../domain/dsl-types';`.
- The existing guards still prove two things separately:
  - non-renderer backflow stays at `0`
  - the facade stays re-export only

## Why `renderer/types imports: 0` Does Not Mean The File Should Be Deleted Immediately

- The inventory metric is about remaining import edges, not about physical file existence.
- ADR 0003 treats deletion as a separate future decision after the broader removal conditions are satisfied and documented.
- The file is still an explicit compatibility edge, even if current first-party import sites have drained away.
- Deletion would need its own scoped review because it changes the public shape of the renderer layer, not just one import edge.

## Assessment

- The component wave succeeded. The old reason for keeping the facade during active renderer churn is gone.
- Even so, the repo does not yet justify deleting `src/renderer/types.ts` inside a docs-only closeout slice.
- The correct current state is:
  - keep the facade
  - keep it thin
  - do not add new shared types or aliases there
  - treat deletion as a separate backlog decision, not as an implicit cleanup

## Re-entry Trigger For PM

PM should open a dedicated facade-removal or facade-audit ticket only after one of the following becomes the concrete next question:

1. The team wants to remove `src/renderer/types.ts` physically and is ready to verify external contract impact, migration steps, and guard updates in one scoped change.
2. A real renderer-local shared type seam appears and justifies a `preview-types.ts` or similar split.
3. A maintainer or reviewer finds an actual consumer, build concern, or downstream contract that still depends on keeping the facade file present.

Until then, the correct planning default is facade retention with no new code churn.

## What The Next Slice Should Not Be

- Do not delete `src/renderer/types.ts` as a drive-by cleanup.
- Do not recreate component batching work; that lane is already closed.
- Do not invent `preview-types.ts` without a concrete renderer-local shared type need.

## Verification Anchor

- `npm run check:dsl-types-ssot`
- `tests/unit/renderer-types-thin-facade.test.js`
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`
- `tests/unit/non-renderer-ssot-meta-guard.test.js`
- `tests/unit/ssot-eslint-restriction-scope.test.js`

## Related Notes

- [ssot-renderer-types-inventory.md](./ssot-renderer-types-inventory.md)
- [ssot-renderer-components-batching-memo.md](./ssot-renderer-components-batching-memo.md)
- [adr/0003-dsl-types-canonical-source.md](./adr/0003-dsl-types-canonical-source.md)
- [MAINTAINER_GUIDE.md](./MAINTAINER_GUIDE.md)
