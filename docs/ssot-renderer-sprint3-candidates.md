# SSoT Renderer Sprint 3 Candidates

Updated: 2026-03-27

## Role Of This Note

This is now a historical planning note. It captures how the renderer shrinkage work was originally sliced before the later preview and component follow-up waves landed.

## Historical Readout

- At the time of this note, `src/renderer/types.ts` had already converged to a thin facade.
- Entry-file direct imports had already landed.
- Kernel files were the next intended proof point.
- `preview-built-in-renderers.tsx` and `components/*` were still future candidates rather than completed work.

## What Landed After This Planning Note

- `component-map.tsx`, `registered-component-kernel.tsx`, and `preview-diff.ts` moved to direct `domain/dsl-types` imports.
- `preview-built-in-renderers.tsx` also moved to direct `domain/dsl-types`.
- The renderer component follow-up batches landed across the leaf and nested files.
- The remaining renderer-side question is now facade handling, not candidate selection for component migration.

## How To Read This Document Now

- Use it as a record of the earlier sequencing logic, not as the current backlog source.
- The old "hold" labels for preview and component files are historical.
- The old Sprint 4 input is complete history now, not an open recommendation.

## Current Source Of Truth

- Current renderer inventory: [ssot-renderer-types-inventory.md](ssot-renderer-types-inventory.md)
- Current facade assessment: [ssot-renderer-facade-sprint3-decision.md](ssot-renderer-facade-sprint3-decision.md)
- Component wave closeout: [ssot-renderer-components-batching-memo.md](ssot-renderer-components-batching-memo.md)

## Preserved Historical Summary

- Entry files were the first confirmed direct-import case.
- Kernel files were intentionally chosen as the first renderer-internal shrinkage slice.
- `preview-built-in-renderers.tsx` was originally deferred because of heavier type fan-in.
- Component files were originally deferred to avoid broad churn before the kernel direction was proven.
- `src/renderer/types.ts` deletion was already a non-goal at that stage.
