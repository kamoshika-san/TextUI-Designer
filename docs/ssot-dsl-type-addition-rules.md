# SSoT DSL Type Addition Rules

Updated: 2026-03-24

## Goal

Give implementers one short path for adding shared DSL types or built-in components without drifting away from `domain/dsl-types` as the canonical source.

## Start Here

1. Add or change shared DSL types through `src/domain/dsl-types/` and keep the public entry at `src/domain/dsl-types/index.ts`.
2. If the change introduces a new built-in kind, add the name first in `src/components/definitions/built-in-components.ts`.
3. Put the type body in the owning category file, then update `ComponentDef`, `PageDef`, related guards, and any DSL unions in `src/domain/dsl-types/component-def.ts`.
4. Update descriptor and schema-facing definitions under `src/components/definitions/*`.
5. Keep `src/renderer/types.ts` as a thin facade only. Do not add type bodies, aliases, or logic there.

## File Placement Rules

| What you are adding | Primary file |
|---|---|
| Built-in kind name | `src/components/definitions/built-in-components.ts` |
| Text / link / breadcrumb / badge / image / icon / progress types | `src/domain/dsl-types/text-navigation-media.ts` |
| Button types | `src/domain/dsl-types/button.ts` |
| Input / checkbox / radio / select / date / form types | `src/domain/dsl-types/form.ts` |
| Layout / compound / nested structure types | `src/domain/dsl-types/layout-compound.ts` |
| Shared DSL unions, `PageDef`, `TextUIDSL`, and guards | `src/domain/dsl-types/component-def.ts` |
| Component descriptor typing | `src/components/definitions/types.ts` |
| Descriptor metadata and properties | `src/components/definitions/manifest.ts` |
| Preview / exporter capability metadata | `src/components/definitions/exporter-renderer-definitions.ts` |
| Final assembled definitions | `src/components/definitions/component-definitions.ts` |

## Non-Rules

- Do not add new shared DSL type bodies to `src/renderer/types.ts`.
- Do not add new non-renderer imports from `renderer/types`.
- Do not treat facade removal or broad type splitting as part of this Sprint 1 slice.

## Built-In Addition Order

1. `src/components/definitions/built-in-components.ts`
2. The owning category file under `src/domain/dsl-types/`
3. `src/domain/dsl-types/component-def.ts`
4. `src/components/definitions/types.ts`
5. `src/components/definitions/manifest.ts`
6. `src/components/definitions/exporter-renderer-definitions.ts`
7. `src/components/definitions/component-definitions.ts`
8. Preview / exporter registration only where the component actually needs runtime wiring

## Category Map

| Category | Current physical file |
|---|---|
| Text / navigation / media | `src/domain/dsl-types/text-navigation-media.ts` |
| Button | `src/domain/dsl-types/button.ts` |
| Form | `src/domain/dsl-types/form.ts` |
| Layout / compound | `src/domain/dsl-types/layout-compound.ts` |
| Union / root / guards | `src/domain/dsl-types/component-def.ts` |

## Verification

- `npm run check:dsl-types-ssot`
- `npm run compile`
- `npx mocha --no-config --require ./tests/setup.js --timeout 5000 --exit tests/unit/renderer-types-non-renderer-import-guard.test.js tests/unit/dsl-types-descriptor-sync.test.js tests/unit/component-contract-consistency.test.js`

## Use This With

- [adding-built-in-component.md](adding-built-in-component.md)
- [component-add-contract.md](component-add-contract.md)
- [ssot-sprint1-boundary-baseline.md](ssot-sprint1-boundary-baseline.md)
- [adr/0003-dsl-types-canonical-source.md](adr/0003-dsl-types-canonical-source.md)
