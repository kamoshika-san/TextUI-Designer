# ADR 0011: Navigation v2 graph-first model

## Status

Accepted - 2026-04-11

## Context

- ADR 0010 intentionally established a minimal Phase 1 contract for `.tui.flow.yml` files.
- The current `screens[]` plus `transitions[]` shape is sufficient for authoring and simple validation, but downstream features now need graph-aware semantics.
- Planned capabilities include route search from entry to terminal nodes, loop-aware validation, stable transition identity for semantic diff, and richer preview/export behavior.
- The repository already has multiple navigation consumers in CLI, preview, exporter, diagnostics, and semantic diff, so the contract must evolve without forcing a flag-day rewrite.

## Decision

### 1. Keep YAML authoring array-based, but make the model graph-first

Navigation v2 retains `screens[]` and `transitions[]` for readable authoring, while treating the document as a directed graph at runtime.

- `screens[]` remains the canonical node list.
- `transitions[]` remains the canonical edge list.
- Runtime services build adjacency and reverse-adjacency indexes from that source of truth.

This preserves author ergonomics while making route-query and analysis features first-class.

### 2. Add stable metadata needed for graph queries

Navigation v2 expands the model with optional metadata:

- `flow.version?: "1" | "2"`
- `flow.policy?: { loops?: "deny" | "warn" | "allow"; terminalScreensRequired?: boolean }`
- `screen.kind?: "screen" | "decision" | "review" | "terminal"`
- `screen.tags?: string[]`
- `screen.terminal?: { kind: "success" | "failure" | "cancel" | "handoff"; label?: string; outcome?: string }`
- `transition.id?: string`
- `transition.kind?: "forward" | "branch" | "backtrack" | "retry" | "loop" | "escalation"`
- `transition.tags?: string[]`
- `transition.guard?: { expression?: string; params?: string[] }`

These additions support:

- stable edge references for semantic diff and diagnostics,
- explicit terminal semantics for route search,
- loop policy that does not force every cycle to be invalid,
- richer classification of business-flow branches and retries.

### 3. Preserve backward compatibility for v1 documents

Existing v1 documents remain valid.

- All new graph-first fields are optional.
- `entry`, `screens`, and `transitions` remain required.
- Existing `condition` and `params` fields stay valid for compatibility and can coexist with `guard`.

This allows staged adoption across preview, CLI, MCP, exporter, and validation layers.

### 4. Move graph meaning into shared runtime helpers

The DSL itself remains declarative. Graph traversal logic belongs in shared runtime helpers rather than inline consumer-specific parsing.

Required runtime outputs for later work:

- adjacency by screen id,
- reverse adjacency by screen id,
- transition lookup by stable identity,
- terminal screen lookup,
- route search helpers based on policy-aware traversal.

## Consequences

- The schema can express branching, retry, review-back, and terminal outcomes without switching authoring to a map-heavy structure.
- Validators and route-query features can agree on one shared notion of loops and terminal endpoints.
- Existing consumers can adopt v2 incrementally because the expansion is additive.
- Some semantics remain policy-driven rather than schema-enforced, so validator and runtime helper work must follow quickly after this ADR.

## References

- [ADR 0010](./0010-navigation-dsl-design.md)
- `src/domain/dsl-types/navigation.ts`
- `schemas/navigation-schema.json`
