# SSoT renderer/types Inventory

Updated: 2026-03-27

This note captures the current renderer-side state after the entry, kernel, preview, and component direct-import slices landed.

## Layer Summary

- renderer facade: `src/renderer/types.ts` remains a thin facade and re-export only.
- renderer entry: `webview.tsx` and `use-webview-messages.ts` already import `domain/dsl-types` directly.
- renderer kernel: `component-map.tsx` and `registered-component-kernel.tsx` already import `domain/dsl-types` directly.
- renderer preview: `preview-built-in-renderers.tsx` and `preview-diff.ts` already import `domain/dsl-types` directly.
- renderer components: all current `src/renderer/components/*` files that consume shared DSL contracts now import `../domain/dsl-types` directly.
- non-renderer layers: direct `renderer/types` usage remains at `0` under the existing guards.

## Current Snapshot

- `npm run check:dsl-types-ssot`
- Result: `domain/dsl-types imports: 74`, `renderer/types imports: 0`
- `src/renderer/types.ts` still contains only `export * from '../domain/dsl-types';`

## Why The Old Component Plan Is Closed

- The previous inventory state that treated `preview-built-in-renderers.tsx` as the last preview fan-in and `components/*` as deferred work is no longer current.
- The preview follow-up and all planned component batches have already landed.
- The inventory no longer needs to split component work into "leaf" and "nested" future slices because those slices are now complete history, not pending scope.

## Renderer Lane Status

| Lane | Status | Notes |
|---|---|---|
| facade | active | Keep as thin compatibility edge unless a later decision changes that |
| entry | complete | Direct `domain/dsl-types` imports already in place |
| kernel | complete | Kernel import edges already drained |
| preview | complete | `preview-built-in-renderers.tsx` and `preview-diff.ts` are direct-import paths now |
| component | complete | Current component files no longer depend on `../types` |

## Component Closeout

Completed direct-import coverage now includes:

- `Alert`, `Breadcrumb`, `Button`, `Checkbox`, `Container`, `DatePicker`, `Divider`, `Icon`, `Image`, `Input`, `Link`, `Spacer`, `Text`
- `Badge`, `Progress`, `Radio`, `Select`
- `Accordion`, `Tabs`, `TreeView`
- `Form`, `Table`

## Remaining Decision Surface

- The main remaining renderer-side question is the role and timing of `src/renderer/types.ts`, not component batching.
- ADR 0003 still governs the facade as a thin compatibility edge.
- Any future code slice should justify itself as facade removal preparation or a new renderer-local type split, not as unfinished component migration.

## Verification Anchor

- `npm run check:dsl-types-ssot`
- `tests/unit/renderer-types-thin-facade.test.js`
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`
- `tests/unit/non-renderer-ssot-meta-guard.test.js`
- `tests/unit/ssot-eslint-restriction-scope.test.js`

## Related Notes

- [ssot-renderer-components-batching-memo.md](./ssot-renderer-components-batching-memo.md)
- [ssot-renderer-facade-sprint3-decision.md](./ssot-renderer-facade-sprint3-decision.md)
- [ssot-renderer-sprint3-entry-closeout.md](./ssot-renderer-sprint3-entry-closeout.md)
- [adr/0003-dsl-types-canonical-source.md](./adr/0003-dsl-types-canonical-source.md)
