# ADR 0010: Navigation Flow DSL design

## Status

Accepted - 2026-04-09
Phase 1 baseline only as of 2026-04-11. See ADR 0011 for the graph-first v2 expansion.

## Context

- Epic `E-Nav-A` introduces a new `.tui.flow.yml` document family for navigation-flow authoring.
- The repository already treats `src/domain/dsl-types/` via its public `index.ts` as the canonical shared DSL type entrypoint.
- Phase 1 needs a minimal but stable contract for flow documents before schema generation, diagnostics, and preview rendering can build on top of it.
- The extension must recognize `.tui.flow.yml` as YAML without accidentally routing those files through the existing page-schema lane.

## Decision

### 1. Canonical flow document shape

Navigation flow documents use one top-level `flow` object.

```ts
export interface ScreenRef { id: string; page: string; title?: string; }
export interface TransitionDef { from: string; to: string; trigger: string; label?: string; condition?: string; params?: string[]; }
export interface NavigationFlowDef { id: string; title: string; entry: string; screens: ScreenRef[]; transitions: TransitionDef[]; }
export interface NavigationFlowDSL { flow: NavigationFlowDef; }
```

Required invariants for Phase 1:

- `flow.id`, `flow.title`, and `flow.entry` are required strings.
- `flow.screens` is a required array of `ScreenRef`.
- `flow.transitions` is a required array of `TransitionDef`.
- `title`, `label`, `condition`, and `params` remain optional fields.

### 2. Canonical runtime guard

`isNavigationFlowDSL()` is the canonical runtime guard for this Phase 1 shape.

- The guard validates required string fields.
- The guard validates `screens` and `transitions` item-by-item.
- The guard is intentionally structural and does not yet enforce cross-reference rules such as `entry` existing in `screens` or `from/to` targeting known screens.

Those semantic checks belong to Nav-A3 validation work, not this ADR.

### 3. Canonical type ownership

- The flow DSL types live in `src/domain/dsl-types/navigation.ts`.
- External shared-type consumers must import through `src/domain/dsl-types/index.ts`.
- `src/domain/dsl-types/dsl-types.ts` re-exports the navigation slice so the public barrel stays complete.

This keeps navigation flow types inside the same shared-domain boundary as the existing UI DSL while avoiding direct deep imports from feature code.

### 4. File association boundary

- `.tui.flow.yml` and `.tui.flow.yaml` are associated with the YAML language in VS Code.
- Phase 1 does not register those files against the existing page JSON schema.
- Phase 1 only adds load-path recognition so later schema and diagnostics work can branch safely by file kind.

## Consequences

- Downstream schema, diagnostics, and preview tickets can build on one agreed document contract instead of inferring shape from ad hoc samples.
- Existing `TextUIDSL` consumers remain unchanged for current UI DSL flows.
- Flow files become editor-recognizable now, while schema and validation remain intentionally deferred to later sprints.
- New graph-query semantics such as terminal metadata, stable edge identity, and loop policy are intentionally out of scope for this ADR and move to ADR 0011.

## References

- [ADR 0003](./0003-dsl-types-canonical-source.md)
- [ADR 0011](./0011-navigation-v2-graph-model.md)
- `src/domain/dsl-types/navigation.ts`
- `src/dsl/load-dsl-with-includes.ts`
