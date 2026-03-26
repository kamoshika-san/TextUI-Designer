# SSoT Renderer Sprint 3 Candidates

Updated: 2026-03-26

## Goal

Turn the current renderer-side DSL type usage into an execution-ready slice list for Sprint 3 and Sprint 4 planning.

## Current Repo State

- `renderer/types` remains a thin facade only.
- Non-renderer `renderer/types` imports remain at `0`.
- WebView entry files already import `domain/dsl-types` directly.
- Remaining facade usage is now concentrated inside `src/renderer/**`.

## Classification

| Group | Current files | Sprint 3 stance | Why |
|---|---|---|---|
| Keep as facade-only compatibility | `src/renderer/types.ts` | Keep | Compatibility edge only; not the migration target |
| Already migrated entry files | `src/renderer/webview.tsx`, `src/renderer/use-webview-messages.ts` | Keep direct domain imports | T-167 PoC already landed and is stable |
| Immediate kernel candidates | `src/renderer/component-map.tsx`, `src/renderer/registered-component-kernel.tsx`, `src/renderer/preview-diff.ts` | Best next direct-import slice | Shared DSL contracts are explicit and churn is still localized |
| Preview integration hold | `src/renderer/preview-built-in-renderers.tsx` | Hold behind a focused follow-up | Heavy type fan-in makes it a better second pass after kernel evidence |
| Component leaf hold | `src/renderer/components/*` | Hold component-by-component | Broad churn with low payoff until kernel direction is proven |
| Preview-only type split candidate | No concrete standalone file yet | Do not create preemptively | No renderer-local shared preview model exists today |

## Recommended Order

1. Keep entry files as the reference case for direct `domain/dsl-types` usage.
2. Run one kernel-oriented slice on `component-map.tsx`, `registered-component-kernel.tsx`, and `preview-diff.ts`.
3. Re-evaluate `preview-built-in-renderers.tsx` only after the kernel slice is accepted.
4. Leave `components/*` on the facade unless a focused diff shows measurable simplification.

## Notes By Area

- `component-map.tsx` only needs `ComponentDef` and sits at the renderer wiring edge, so it is the cleanest post-entry target.
- `registered-component-kernel.tsx` also only depends on `ComponentDef`; it is a good proof point for shared-kernel direct import.
- `preview-diff.ts` consumes `ComponentDef` and `TextUIDSL` without preview-only local types, so it is still a direct-import candidate, not a `preview-types` driver.
- `preview-built-in-renderers.tsx` pulls many DSL contracts at once. It is a valid migration target, but it should not be bundled with the kernel PoC because the churn surface is much larger.
- `components/*` mostly consume one or two concrete contracts through `../types`; changing them all together would create noisy diffs without changing the architectural decision.

## Sprint 4 Input

- Preferred next implementation slice: `component-map.tsx` + `registered-component-kernel.tsx` + `preview-diff.ts`.
- Deferred slice trigger: move `preview-built-in-renderers.tsx` only after the kernel slice passes review without new boundary issues.
- Non-goal: deleting `src/renderer/types.ts`.
- Non-goal: inventing `preview-types.ts` before a real preview-only shared type appears.

## Use With

- [ssot-renderer-types-inventory.md](ssot-renderer-types-inventory.md)
- [ssot-webview-dsl-types-direct-import-poc.md](ssot-webview-dsl-types-direct-import-poc.md)
- [ssot-renderer-facade-sprint3-decision.md](ssot-renderer-facade-sprint3-decision.md)
