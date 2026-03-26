# SSoT Renderer Sprint 3 Entry Closeout

Updated: 2026-03-26

## Scope

- T-301 renderer inventory refresh
- T-302 entry direct-import closeout

## Current State

- `src/renderer/webview.tsx` imports `TextUIDSL` and `ComponentDef` from `../domain/dsl-types`.
- `src/renderer/use-webview-messages.ts` imports `TextUIDSL` from `../domain/dsl-types`.
- `src/renderer/types.ts` remains a thin facade for renderer-internal compatibility.
- Non-renderer `renderer/types` imports remain at `0`.

## Why This Closes T-301 / T-302

- The inventory now distinguishes entry, kernel, preview, component, and facade lanes.
- The entry-file migration is no longer hypothetical; it is already the current repo state.
- The remaining Sprint 3 work is renderer-internal follow-up, not more entry migration.

## Next Slice

- `src/renderer/component-map.tsx`
- `src/renderer/registered-component-kernel.tsx`
- `src/renderer/preview-diff.ts`

## Deferred

- `src/renderer/preview-built-in-renderers.tsx`
- `src/renderer/components/*`

## Verification Anchor

- `npm run check:dsl-types-ssot`
- `tests/unit/renderer-types-thin-facade.test.js`
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`
- `tests/unit/non-renderer-ssot-meta-guard.test.js`
- `tests/unit/ssot-eslint-restriction-scope.test.js`
