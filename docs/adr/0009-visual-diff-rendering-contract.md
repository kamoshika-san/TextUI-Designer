# ADR 0009: Visual Diff Rendering Contract

## Status

Accepted - 2026-04-02

## Context

- [ADR 0007](./0007-export-diff-purpose.md) defines diff as an observation-oriented product surface and explicitly leaves any promotion into rendering behavior to a separate ADR.
- Existing diff workflow materials define artifact export, review gates, and PR/check-run behavior, but they do not define the renderer-facing contract for a Visual Diff UI.
- Epic V0 Sprint P1 already fixed three contract slices in code:
  - `visual-diff-view-model/v0` in `src/core/textui-visual-diff-view-model.ts`
  - `visual-diff-presentation/v0` in `src/core/textui-visual-diff-presentation.ts`
  - `visual-diff-navigation/v0` in `src/core/textui-visual-diff-navigation.ts`
- Without one canonical ADR, renderer tickets would need to infer semantics from multiple tickets and implementation files, which reintroduces drift risk.

## Decision

Visual Diff rendering must consume one canonical contract stack, and this ADR is the source of truth for that stack.

### 1. Canonical input surface

Visual Diff is a composition layer over existing diff outputs. It does not introduce a new compare engine.

- Required upstream inputs:
  - `DiffResultExternal`
  - `DiffReviewImpactResult`
  - `DiffNarrativeResult`
- Required composition step:
  - Build `visual-diff-view-model/v0`
- Required renderer-facing derived layers:
  - Build `visual-diff-presentation/v0`
  - Build `visual-diff-navigation/v0`

Renderer code must consume the derived Visual Diff contracts, not re-derive severity, ambiguity, or navigation semantics directly from raw diff events.

### 2. Canonical renderer-facing layers

The renderer-facing contract is split into three stable layers.

#### 2.1 ViewModel layer

`visual-diff-view-model/v0` is the canonical semantic aggregation layer.

- Each item must expose:
  - `nodeId`
  - `changeKind`
  - `entityKind`
  - `severity`
  - `isHeuristic`
  - `isAmbiguous`
  - `beforePath`
  - `afterPath`
  - `label`
  - `evidenceRefs`
- `evidenceRefs.eventId` is mandatory.
- `evidenceRefs.impactEventId`, `summaryKey`, `narrativeAxis`, and `narrativeIndex` are optional evidence enrichments.
- `evidenceRefs.previousSourcePath` and `nextSourcePath` are document-level navigation inputs and may be absent.
- `label` must prefer narrative text when present and otherwise fall back to rule-trace-aware copy.

#### 2.2 Presentation layer

`visual-diff-presentation/v0` is the canonical mapping from semantic state to UI treatment.

- Severity mapping is fixed one-to-one:
  - `s3-critical -> critical`
  - `s2-review -> warn`
  - `s1-notice -> notice`
  - `s0-minor -> minor`
- Render style mapping is fixed:
  - `add -> addition`
  - `remove -> removal`
  - `update -> update`
  - `reorder -> reorder`
  - `move -> move`
  - `rename -> rename`
  - `remove+add -> replace-split`
- Badge semantics are fixed:
  - `heuristic` when matching depends on heuristic similarity
  - `ambiguous` when ambiguity is present
  - `fallback` when ambiguity is present or `remove+add` is forced
  - `replace` when `changeKind` is `remove+add`
  - `review-required` when heuristic-derived content reaches `s2-review` or `s3-critical`
- Review priority is fixed:
  - `high` for ambiguity or `s3-critical`
  - `medium` for heuristic-derived items or `s2-review`
  - `low` otherwise

#### 2.3 Navigation layer

`visual-diff-navigation/v0` is the canonical mapping for before/after DSL jump affordances.

- Each item must expose:
  - `primarySide`
  - `before`
  - `after`
- Each side must expose:
  - `availability`
  - `label`
  - `missingReason`
  - `fallbackText`
  - `visibility.compact`
  - `visibility.full`
- `path` and `sourcePath` are required only when that side is available.
- Availability rules are fixed:
  - `add` expects only `after`
  - `remove` expects only `before`
  - all other current change kinds expect both sides
- Missing-state semantics are fixed:
  - `not-applicable`
  - `missing-path`
  - `missing-source-ref`
  - `missing-path-and-source-ref`

### 3. Required semantic interpretations

#### 3.1 `remove+add`

- `remove+add` is a first-class replacement-oriented state, not a renderer-local guess.
- It must render through `replace-split`.
- It must carry `replace`.
- It must also carry `fallback` because the pairing is non-deterministic from the renderer's point of view.
- Downstream UI may choose different layouts later, but it must preserve the replacement/fallback semantics from this contract.

#### 3.2 Heuristic similarity

- Heuristic matching must be surfaced explicitly through `isHeuristic` and the `heuristic` badge.
- Renderer code must not attempt to hide or downgrade heuristic provenance.
- When heuristic-derived items are severe enough to require review, the renderer must surface `review-required` rather than inventing a separate escalation rule.

#### 3.3 Fallback and ambiguity

- Ambiguity is a semantic signal, not only a styling hint.
- The renderer must treat ambiguity as contract-bearing through:
  - `isAmbiguous`
  - `fallback`
  - `ambiguous`
  - elevated review priority where specified
- Renderer code must not reinterpret `fallbackMarker` directly once the Visual Diff contract has been built.

### 4. Mandatory vs optional fields

The following contract boundary is fixed for implementation start.

- Mandatory for all renderer items:
  - `nodeId`
  - `changeKind`
  - `severity`
  - `label`
  - `evidenceRefs.eventId`
  - presentation severity/render-style/review-priority fields
  - navigation `availability`, `missingReason`, and visibility fields
- Optional by design:
  - `beforePath`
  - `afterPath`
  - `evidenceRefs.previousSourcePath`
  - `evidenceRefs.nextSourcePath`
  - narrative enrichment fields inside `evidenceRefs`
- Constraint:
  - optional path/source fields must never produce a broken navigation state; the renderer must rely on navigation-layer `availability` and fallback copy instead.

### 5. Boundary with existing ADRs and workflow docs

- ADR 0007 remains the source of truth for diff's export/observation positioning.
- This ADR does not promote export diff instrumentation into incremental rendering behavior.
- This ADR only defines how already-produced diff/review/narrative outputs become a Visual Diff rendering contract.
- Gate behavior, rollout stages, and PR/check-run policy stay outside this ADR and remain part of workflow or rollout planning.

### 6. What this ADR does not decide

This ADR does not lock:

- compact/full/split layout composition
- final color token values or typography
- WebView interaction wiring
- virtualization or large-result degradation strategy
- rollout stage gates

Those decisions belong to later V0 tickets and must build on this contract rather than replace it.

## Consequences

- Renderer implementation can start from one fixed contract without re-deriving semantics from raw diff artifacts.
- P2 and P3 tickets can focus on display behavior, fixture design, and rollout quality gates instead of reopening core rendering semantics.
- Any future change to severity mapping, ambiguity treatment, `remove+add` semantics, or navigation availability now requires an ADR or an explicit contract-versioning decision.

## References

- [ADR 0007](./0007-export-diff-purpose.md)
- [docs/current/theme-export-rendering/export-instrumentation.md](../export-instrumentation.md)
- [docs/current/theme-export-rendering/export-diff-observation-path.md](../export-diff-observation-path.md)
- `src/core/textui-visual-diff-view-model.ts`
- `src/core/textui-visual-diff-presentation.ts`
- `src/core/textui-visual-diff-navigation.ts`
