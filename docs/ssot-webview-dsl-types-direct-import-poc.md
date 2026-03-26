# WebView Entry Direct `domain/dsl-types` PoC

Updated: 2026-03-26

## Goal

Confirm that WebView entry files can import shared DSL contracts directly from `src/domain/dsl-types` without going through `src/renderer/types.ts`.

## Files Changed In The PoC

| File | Change |
|---|---|
| `src/renderer/webview.tsx` | `TextUIDSL` and `ComponentDef` import changed from `./types` to `../domain/dsl-types` |
| `src/renderer/use-webview-messages.ts` | `TextUIDSL` import changed from `./types` to `../domain/dsl-types` |

## Result

Direct import is viable for WebView entry files.

## Why It Worked

- `src/renderer/types.ts` is already a thin facade that only re-exports `../domain/dsl-types`.
- The renderer layer is not blocked from importing `domain/dsl-types` directly.
- The change only removes one compatibility hop; it does not change the meaning of the imported types.

## Limits Of The PoC

- It only proves the entry-file case.
- It does not justify deleting `src/renderer/types.ts`.
- It does not prove that broad component-level migration is worth the churn.
- It does not reveal a concrete `preview-types.ts` split point.

## Sprint 3 Readout

- Keep the entry-file direct imports as-is.
- Treat `component-map.tsx`, `registered-component-kernel.tsx`, and `preview-diff.ts` as the next renderer-internal direct-import candidates.
- Keep `preview-built-in-renderers.tsx` and `components/*` for later focused follow-up.

## Verification Used

- `npm run lint`
- `npm test`

The important outcome is architectural, not behavioral: direct domain imports are compatible with the current renderer entry boundary.
