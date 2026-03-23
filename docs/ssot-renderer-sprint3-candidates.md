# SSoT Renderer Sprint 3 Candidates

Updated: 2026-03-24

## Goal

Turn the current `renderer/types` inventory into an execution-ready classification for the later renderer shrinkage sprint.

## Classification

| Group | Current examples | Sprint 3 stance | Why |
|---|---|---|---|
| Keep as facade-only compatibility | `src/renderer/types.ts` | Keep thin facade until renderer-internal migration slices are complete | It is the compatibility edge, not the target destination |
| Direct-import candidates | `src/renderer/webview.tsx`, `src/renderer/use-webview-messages.ts` | Prefer `domain/dsl-types` directly | T-167 PoC already showed entry files can bypass the facade safely |
| Likely direct-import expansion | `component-map.tsx`, `registered-component-kernel.tsx`, `preview-diff.ts` | Candidate for later migration slice after entry files | Shared DSL contract usage is visible and not obviously preview-only |
| Preview-only type candidates | renderer-local view-model or display-only helper types | Extract toward `preview-types` style file if they appear | These should not expand `renderer/types` or leak back into shared DSL |
| Hold for justification | `src/renderer/components/*` imports through `../types` | Keep for now, revisit component-by-component | Broad churn risk is higher and benefit is lower than entry/kernel slices |

## Recommended Order

1. Entry files already covered by PoC evidence
2. Kernel files that mostly consume shared DSL contracts
3. Component-level cleanup where facade usage is repetitive but low-risk
4. Preview-only type extraction only if new local-only types actually appear

## Current Candidate Notes

- `webview.tsx` and `use-webview-messages.ts` already have direct-import evidence from T-167 and should remain the clearest Sprint 3 starting point.
- `component-map.tsx` and `registered-component-kernel.tsx` are good next-pass candidates because they sit near renderer wiring, not broad leaf rendering churn.
- `components/*` should not be mass-migrated blindly. They are better treated as a later wave or left alone if the facade cost stays low.
- Preview-only type extraction is a contingency path, not a mandatory Sprint 3 deliverable.

## PoC Candidates

| Candidate | Why it is useful |
|---|---|
| `component-map.tsx` direct import PoC | Tests whether kernel wiring can drop facade usage without touching every renderer leaf |
| `registered-component-kernel.tsx` direct import PoC | Tests shared-kernel behavior with direct domain contracts |
| Small component pair such as `Text.tsx` and `Button.tsx` | Cheap sample to measure leaf-file churn before any wider migration |

## Hold Reasons

- Do not couple this sprint to deleting `src/renderer/types.ts`.
- Do not introduce new preview-only types just to justify a split.
- Do not widen scope into non-renderer layers; Sprint 1 already fixed that boundary.

## Use With

- [ssot-renderer-types-inventory.md](ssot-renderer-types-inventory.md)
- [ssot-webview-dsl-types-direct-import-poc.md](ssot-webview-dsl-types-direct-import-poc.md)
- [renderer-types-responsibilities.md](renderer-types-responsibilities.md)
