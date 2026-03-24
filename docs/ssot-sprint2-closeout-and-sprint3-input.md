# SSoT Sprint 2 Closeout And Sprint 3 Input

Updated: 2026-03-25

## Sprint 2 Closeout Summary

- **T-370**: Fixed the placement map so `text-navigation-media.ts`, `form.ts`, `layout-compound.ts`, `button.ts`, and `component-def.ts` are the canonical files for their categories; documented the rule set inside `docs/ssot-dsl-type-addition-rules.md`.
- **T-371**: Told maintainers that `text-navigation-media.ts` is the only home for the text/navigation/media family and added a guard that ensures `dsl-types.ts`, `form.ts`, and `component-def.ts` import from it.
- **T-372**: Rewrote `form.ts` as the single source for inputs, selects, radios, date pickers, form actions, and the nested helpers that sit inside form fields.
- **T-373**: (In flight) keeps layout/compound structures inside `layout-compound.ts` and keeps their helpers documented by the Sprint 2 category map.
- **T-374**: Grouped `ComponentDef`’s union/guards by category, spelled out the `DSL_COMPONENT_KINDS` → `BUILT_IN_COMPONENTS` dependency, and kept `component-def.ts` as the single bundle point for guards and unions.
- **T-375**: This document plus the new placement map (`docs/ssot-sprint2-category-placement-map.md`) is the Sprint 2 inventory; it completes the sprint by capturing the canonical layout and the residual risks that feed Sprint 3.

## Guard Coverage

- `npm run check:dsl-types-ssot`
- `npx mocha --no-config --require ./tests/setup.js --timeout 5000 --exit tests/unit/renderer-types-thin-facade.test.js tests/unit/renderer-types-non-renderer-import-guard.test.js tests/unit/ssot-eslint-restriction-scope.test.js tests/unit/non-renderer-ssot-meta-guard.test.js`
- `npx mocha --no-config --require ./tests/setup.js --timeout 5000 --exit tests/unit/dsl-types-descriptor-sync.test.js tests/unit/component-contract-consistency.test.js`
- Regression coverage proves `renderer/types` is still a thin facade, layout/form/media files stay in sync with the union, and DSL component kind lists mirror `BUILT_IN_COMPONENTS`.

## Outstanding Items

1. Layout/compound primaries (T-373) still need the final canonical note before we can mark Sprint 2 fully `done`.
2. Renderer-side shrinkage (Sprint 3) must respect the Sprint 2 placement map rather than re-opening the canonical source question; keep `src/domain/dsl-types/` as the single survey path.
3. Built-in component additions must continue to follow the new addition rules to keep descriptor, guard, and union updates in lockstep.

## Sprint 3 Input Pack

1. Use `docs/ssot-renderer-sprint3-candidates.md` as the starting list for renderer shrinkage work and only touch `src/renderer/types.ts` through a guard-confirmed drainage plan.
2. Treat `ComponentDef`/guard synchronization and `DSL_COMPONENT_KINDS` derivation as the sprint-2 deliverable when moving to renderer types; do not re-split the canonical families.
3. Keep validation high: `npm run check:dsl-types-ssot`, the guard suite above, and the descriptor sync tests are the ongoing checklist any Sprint 3 work should pass before landing.
4. Any new built-in component or guard change must hit `docs/adding-built-in-component.md` and `BUILT_IN_COMPONENTS` before touching `dsl-types/component-def.ts`.

## References

- `docs/ssot-sprint2-category-placement-map.md`
- `docs/ssot-dsl-type-addition-rules.md`
- `docs/ssot-renderer-sprint3-candidates.md`
