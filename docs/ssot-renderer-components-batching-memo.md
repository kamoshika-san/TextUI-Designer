# SSoT Renderer Components Batching Memo

Updated: 2026-03-26

## Goal

Turn the deferred `src/renderer/components/*` facade usage into reviewable follow-up batches without reopening a broad renderer migration.

## Current State

- `renderer/types` remains a thin facade only.
- Entry files and the renderer kernel slice already import `domain/dsl-types` directly.
- `preview-built-in-renderers.tsx` is the remaining renderer-local `./types` fan-in point and should be handled before broad component churn.
- Component files mostly consume one concrete DSL contract each through `../types`.

## Recommended Order

1. Finish `preview-built-in-renderers.tsx` as a single-file follow-up.
2. Move the simple leaf component files in one small implementation batch.
3. Move the enum/option leaf files in a second batch if the first leaf pass stays clean.
4. Leave nested or recursive component files for a later focused pass.

## Proposed Batches

| Batch | Files | Why this grouping works | Not included |
|---|---|---|---|
| Preview integration follow-up | `src/renderer/preview-built-in-renderers.tsx` | Only remaining renderer-local `./types` user; high fan-in but still one file | `components/*` |
| Leaf batch A | `Alert`, `Breadcrumb`, `Button`, `Checkbox`, `Container`, `DatePicker`, `Divider`, `Icon`, `Image`, `Input`, `Link`, `Spacer`, `Text` | One primary component contract per file; minimal helper coupling | `Badge`, `Progress`, `Radio`, `Select`, nested renderers |
| Leaf batch B | `Badge`, `Progress`, `Radio`, `Select` | Same leaf pattern, but each file also pulls a variant or option helper type | Nested renderers |
| Nested batch hold | `Accordion`, `Form`, `Table`, `Tabs`, `TreeView` | These files carry `ComponentDef`, child item types, or decode/recursive rendering semantics | Everything else |

## Hold Conditions

- Do not combine `preview-built-in-renderers.tsx` and `components/*` in one change.
- Do not treat `src/renderer/types.ts` removal as part of any component batch.
- Do not move nested renderer files until the preview follow-up and at least one leaf batch land without new guard or review concerns.

## Verification Anchor

- `npm run check:dsl-types-ssot`
- `tests/unit/renderer-types-thin-facade.test.js`
- `tests/unit/renderer-types-non-renderer-import-guard.test.js`
- `tests/unit/non-renderer-ssot-meta-guard.test.js`
- `tests/unit/ssot-eslint-restriction-scope.test.js`

## PM / Reviewer Use

- PM can dispatch the preview file independently now.
- After that review closes, PM can cut `Leaf batch A` as the first `components/*` implementation slice.
- Reviewer should reject any batch that expands into mixed preview-plus-component churn or tries to delete the facade outright.
