# SSoT Sprint 1 Boundary Baseline

Updated: 2026-03-24

## Sprint Goal

Share one stable understanding of the DSL type source of truth and its import boundary so later normalization work does not regress.

## Baseline

- Canonical shared DSL types live in `src/domain/dsl-types/`.
- `src/renderer/types.ts` remains a thin facade only.
- New non-renderer imports must use `domain/dsl-types`, not `renderer/types`.
- Sprint 1 fixes observation, terminology, and guard coverage before any larger structural rewrite.

## In Scope

- Reconfirm the canonical source and thin-facade rule from ADR / guide / guard docs.
- Record the current import inventory and guard coverage as a dated snapshot.
- Define what counts as backflow, facade-only responsibility, and direct-import migration candidate.
- State which checks currently enforce the boundary and where gaps remain.

## Out of Scope

- Removing `src/renderer/types.ts`.
- Large-scale type file splitting or moving broad type families.
- Rewriting renderer internals to direct-import `domain/dsl-types`.
- Introducing new shared type definitions as part of this sprint.

## Terms

- Canonical source: The single place where shared DSL type definitions are authored. In this repo that is `src/domain/dsl-types/`.
- Thin facade: A compatibility module that only re-exports canonical definitions and does not define new shared types or logic. In this repo that is `src/renderer/types.ts`.
- Backflow: A non-renderer module importing `renderer/types` instead of `domain/dsl-types`.
- Direct-import migration candidate: A file or layer that still uses the facade today but can be moved to `domain/dsl-types` in a later sprint without changing product behavior.

## Sprint 1 Decision Rules

- If a change adds or edits a shared DSL type, start in `src/domain/dsl-types/`.
- If a change needs WebView-only presentation types, do not add them to `renderer/types.ts`.
- If a review finds a non-renderer `renderer/types` import, treat it as a boundary violation, not a style preference.
- If a task proposes facade removal or broad type splitting, route it to Sprint 2 or Sprint 3 planning unless explicitly re-scoped.
