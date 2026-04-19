# SSoT Renderer Components Closeout Memo

Updated: 2026-03-27

## Scope

- Close out the `src/renderer/components/*` direct-import wave after the preview and component follow-up slices landed.
- Replace the old batching plan with the current state and the next handoff point.

## Current State

- `src/renderer/types.ts` still exists as a thin facade only.
- `src/renderer/preview-built-in-renderers.tsx` already imports `../domain/dsl-types` directly.
- The renderer component files now import `../domain/dsl-types` directly across:
  - leaf batch A
  - leaf batch B
  - nested batch A
  - nested batch B
- `npm run check:dsl-types-ssot` now reports `domain/dsl-types imports: 74` and `renderer/types imports: 0`.

## What This Closes

- The old component batching recommendation has been executed.
- `src/renderer/components/*` is no longer a deferred facade-drain lane.
- The remaining renderer discussion is no longer "how to batch component imports" but "what to do with the surviving thin facade and any future renderer-local type seam".

## Landed Sequence

1. `preview-built-in-renderers.tsx` moved off the facade.
2. Leaf batch A moved the simple one-contract component files.
3. Leaf batch B moved the enum and option helper component files.
4. Nested batch A moved `Accordion`, `Tabs`, and `TreeView`.
5. Nested batch B moved `Form` and `Table`.

## Review Readout

- The wave stayed import-edge only.
- The facade guards remained green throughout the sequence.
- No batch required deleting `src/renderer/types.ts`.
- No batch reintroduced non-renderer `renderer/types` usage.

## Next Lane Handoff

- Treat component migration as complete for Sprint 4 closeout purposes.
- Use `docs/current/dsl-ssot-types/ssot-renderer-types-inventory.md` as the inventory source of truth for the post-component state.
- Route the next PM decision to facade assessment or another renderer-local type boundary question, not back to component batching.

## Verification Anchor

- `npm run check:dsl-types-ssot`
- `tests/unit/renderer-types-thin-facade.test.js`
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`
- `tests/unit/non-renderer-ssot-meta-guard.test.js`
- `tests/unit/ssot-eslint-restriction-scope.test.js`
