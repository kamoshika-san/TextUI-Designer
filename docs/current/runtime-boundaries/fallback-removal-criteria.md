# Exporter Fallback Removal Criteria

This is the deletion gate for exporter legacy/fallback cleanup.

## Hard Gate

The legacy HtmlExporter compatibility lane can be removed only when all of these are true:

| Gate | Required Result | Current Result |
|---|---|---|
| Runtime fallback entries | `0` production entrypoints | Pass |
| Helper definitions/imports | `0` runtime helpers | Pass |
| Raw `useReactRender: false` in `src/**` | `0` files | Pass |
| Primary replacement coverage | representative DSL exports through primary path | Pass |
| Review guard | tests fail on fallback re-entry | Pass |

## Feature Flag Decision

No `USE_LEGACY_EXPORTER` style flag is needed when runtime fallback entries are already zero.
Adding a flag in that state would create a new compatibility surface instead of shrinking one.

If a future branch reintroduces a runtime compatibility path, it must first:

- document the caller and reason in `legacy-dependency-map.md`;
- default the path off;
- add a removal date or PM follow-up ticket;
- keep `HtmlExporter` primary behavior unchanged.

## Reviewer Checklist

- `HtmlExporter` imports no `legacy/**` or `internal/**` fallback modules.
- `useReactRender: false` is rejected, not silently routed.
- The phrase "fallback" is checked for context: visual diff and incremental full-render fallback are not HtmlExporter legacy.
- Deleted legacy files have no source imports.
- `npm run compile`, `npm run check:ssot:exporters`, and focused HTML exporter tests pass.

## Decision

The current repository satisfies the removal gate for `src/exporters/legacy/html-renderers/*`.
The safe action is deletion plus a guard that keeps the directory from returning.

