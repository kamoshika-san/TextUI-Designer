# SSoT Renderer Facade Sprint 3 Decision

Updated: 2026-03-26

## Decision

Keep `src/renderer/types.ts` as a thin facade for now and treat Sprint 3 as a renderer-internal shrinkage sprint, not a facade-removal sprint.

## Evidence

- `npm run check:dsl-types-ssot` reports `domain/dsl-types imports: 47` and `renderer/types imports: 0`.
- `src/renderer/webview.tsx` and `src/renderer/use-webview-messages.ts` already prove direct `domain/dsl-types` imports work for entry files.
- Remaining facade usage is localized to renderer kernel and leaf components, not to non-renderer layers.
- No standalone preview-only shared type module exists today, so a `preview-types.ts` split would be speculative.

## What Sprint 3 Should Do

- Drain the lowest-risk renderer kernel files first.
- Use direct `domain/dsl-types` imports where the file only consumes shared DSL contracts.
- Keep the facade as the compatibility edge while component-level churn is still unproven.

## What Sprint 3 Should Not Do

- Do not delete `src/renderer/types.ts`.
- Do not mass-convert every renderer component import in one slice.
- Do not create `preview-types.ts` just to justify a split.

## Preview PoC Readout

- Result: facade retention is the correct default today.
- Reason: the current preview path does not expose a concrete preview-only shared type seam.
- Consequence: if a future refactor introduces renderer-local shared view-model types, that is the point where `preview-types.ts` becomes justified.

## Sprint 4 Input Pack

### Ready Now

- `src/renderer/component-map.tsx`
- `src/renderer/registered-component-kernel.tsx`
- `src/renderer/preview-diff.ts`

### Hold For Follow-up

- `src/renderer/preview-built-in-renderers.tsx`
- `src/renderer/components/*`

## Review Questions

- Does the next slice keep diff size small enough to review file-by-file?
- Does the next slice avoid changing runtime behavior and only change import edges?
- If `preview-built-in-renderers.tsx` is included, what concrete simplification justifies the larger fan-in diff?
