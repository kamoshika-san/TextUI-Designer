# SSoT DSL Type Addition Rules

Updated: 2026-03-24

## Goal

Give implementers one short path for adding shared DSL types or built-in components without drifting away from `domain/dsl-types` as the canonical source.

## Start Here

1. Add or change shared DSL types in `src/domain/dsl-types.ts`.
2. If the change introduces a new built-in kind, add the name first in `src/components/definitions/built-in-components.ts`.
3. Update `ComponentDef`, `PageDef`, related guards, and any DSL unions in `src/domain/dsl-types.ts`.
4. Update descriptor and schema-facing definitions under `src/components/definitions/*`.
5. Keep `src/renderer/types.ts` as a thin facade only. Do not add type bodies, aliases, or logic there.

## File Placement Rules

| What you are adding | Primary file |
|---|---|
| Built-in kind name | `src/components/definitions/built-in-components.ts` |
| Shared DSL unions and guards | `src/domain/dsl-types.ts` |
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
2. `src/domain/dsl-types.ts`
3. `src/components/definitions/types.ts`
4. `src/components/definitions/manifest.ts`
5. `src/components/definitions/exporter-renderer-definitions.ts`
6. `src/components/definitions/component-definitions.ts`
7. Preview / exporter registration only where the component actually needs runtime wiring

## Verification

- `npm run check:dsl-types-ssot`
- `npm run compile`
- `npx mocha --no-config --require ./tests/setup.js --timeout 5000 --exit tests/unit/renderer-types-non-renderer-import-guard.test.js tests/unit/dsl-types-descriptor-sync.test.js tests/unit/component-contract-consistency.test.js`

## Use This With

- [adding-built-in-component.md](adding-built-in-component.md)
- [component-add-contract.md](component-add-contract.md)
- [ssot-sprint1-boundary-baseline.md](ssot-sprint1-boundary-baseline.md)
- [adr/0003-dsl-types-canonical-source.md](adr/0003-dsl-types-canonical-source.md)
