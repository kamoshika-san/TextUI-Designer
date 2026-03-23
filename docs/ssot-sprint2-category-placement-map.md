# SSoT Sprint 2 Category Placement Map

Updated: 2026-03-24

## Goal

Fix one final mapping between conceptual DSL type categories and the physical files under `src/domain/dsl-types/` so Sprint 2 normalization work does not drift by slice.

## Physical Files Chosen For Sprint 2

| Physical file | Sprint 2 role | Why this stays the unit |
|---|---|---|
| `src/domain/dsl-types/text-navigation-media.ts` | read-only / display / navigation / media family | The current project guidance already treats these nearby families as one operational unit for additions and maintenance |
| `src/domain/dsl-types/button.ts` | button-only family | Button stays separate because it is reused from standalone UI and from form actions without pulling the rest of the form cluster |
| `src/domain/dsl-types/form.ts` | input / selection / form assembly family | Inputs, options, fields, and actions form one natural dependency cluster |
| `src/domain/dsl-types/layout-compound.ts` | layout / nested structure / compound family | These types carry container, nesting, and child-component structure responsibilities |
| `src/domain/dsl-types/component-def.ts` | union / root / guard / built-in-kind boundary | This is the bundle point for `ComponentDef`, `PageDef`, `TextUIDSL`, guards, and `DSL_COMPONENT_KINDS` |

## Conceptual Category To File Mapping

| Conceptual category | Current Sprint 2 file | Notes |
|---|---|---|
| text / display | `text-navigation-media.ts` | Includes `TextComponent` and nearby presentation primitives |
| navigation | `text-navigation-media.ts` | `LinkComponent`, `Breadcrumb*` stay with nearby display-facing contracts |
| feedback / media | `text-navigation-media.ts` now, with `AlertComponent` still in `layout-compound.ts` | Sprint 2 keeps the current physical units explicit instead of forcing an extra split first |
| button | `button.ts` | Independent because `FormAction` and standalone button usage both depend on it |
| form / input | `form.ts` | Input components, options, fields, and actions belong together |
| layout / compound | `layout-compound.ts` | Nested component carriers and structure-heavy components stay together |
| document root | `component-def.ts` | `PageDef` and `TextUIDSL` stay at the bundle point, not in a separate `document.ts` yet |
| union / guards | `component-def.ts` | `ComponentDef`, `is*Component`, `isComponentDefValue`, and `DSL_COMPONENT_KINDS` stay co-located for now |

## Final Placement Rules

1. Normalize within the current five physical files first. Do not create extra conceptual files mid-sprint.
2. Keep `button.ts` separate from `form.ts` because button contracts are reused both inside and outside forms.
3. Treat `PageDef` and `TextUIDSL` as part of the `component-def.ts` bundle point until a later sprint proves a separate `document` file is worth the churn.
4. Keep guards in `component-def.ts` for Sprint 2 so union changes and guard changes cannot drift apart.
5. Continue to expose the canonical entry path through `src/domain/dsl-types/index.ts`; later file movement must not create deep-import expectations.

## Dependency Direction For Sprint 2

1. Category files define component-local props and nested helper types.
2. `component-def.ts` imports category types and defines the top-level union.
3. `PageDef` and `TextUIDSL` depend on `ComponentDef`, not the reverse.
4. Guards and `DSL_COMPONENT_KINDS` stay beside the union they validate.
5. `src/renderer/types.ts` remains a thin facade only and must not become a parallel home for shared type bodies.

## Work Order For The Remaining Sprint 2 Tickets

1. `T-371` normalize `text-navigation-media.ts`
2. `T-372` normalize `form.ts`
3. `T-373` normalize `layout-compound.ts`
4. `T-374` normalize `component-def.ts`
5. `T-375` inventory the result and convert it into Sprint 3 input

## Decisions Captured Here

- Sprint 2 chooses operational file stability over introducing extra intermediate file splits.
- The conceptual `document` and `guards` categories are acknowledged, but they remain physically bundled in `component-def.ts` for this sprint.
- `AlertComponent` remains in `layout-compound.ts` during Sprint 2 because the sprint goal is structural clarity, not maximal taxonomy purity.

## Use With

- [ssot-dsl-type-addition-rules.md](ssot-dsl-type-addition-rules.md)
- [dsl-types-split-inventory.md](dsl-types-split-inventory.md)
- [ssot-sprint1-closeout-and-sprint2-input.md](ssot-sprint1-closeout-and-sprint2-input.md)
