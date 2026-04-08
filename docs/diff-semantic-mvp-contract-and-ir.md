# Semantic Diff MVP Contract And IR

Updated: 2026-04-08
Owner: Maintainer
Related tickets: `T-20260408-731`, `T-20260408-732`

## Purpose

This document is the canonical Sprint 1 contract for `E-SD-01`.

It fixes:

- the semantic diff vocabulary
- the MVP boundary
- the layer model
- the code-facing semantic change contract
- the minimal Diff IR shape, identity policy, and source-reference contract

It sits on top of the existing diff-engine design work and narrows that work into
the first semantic-diff project that can be implemented and reviewed end to end.

This document does not define:

- normalization rules in detail
- tree-diff library choice
- final CLI or WebView formatting
- Phase 2 visual expansion or Phase 3 condition/binding behavior

## Canonical Inputs

Read this document together with:

- `docs/diff-ir-spec-and-guide.md`
- `docs/diff-ir-identity-policy.md`
- `docs/diff-summary-event-vocabulary.md`
- `docs/diff-summary-payload-schema.md`
- `docs/diff-sourcref-jump-and-evidence-navigation.md`
- `src/types/semantic-diff.ts`

Rule of thumb:

- the older Diff IR and summary documents still own the general diff-engine rules
- this document owns the semantic-diff MVP narrowing and the foundation contract

## Semantic Diff Definition

Semantic diff means:

> compare two normalized DSL-derived IR trees and emit UI-spec changes as
> semantic change records grouped by meaning rather than by line-level syntax.

The semantic layer exists to answer:

- what changed in the UI structure
- what changed in behavior
- what changed in reviewer-visible intent

It must not:

- re-read raw DSL text after extraction
- redefine identity outside the IR identity policy
- hide ambiguity behind confident prose

## Layer Model

Use exactly these layers:

- `structure`
- `behavior`
- `visual`
- `data`

Layer ownership:

- `structure`: add, remove, move, parent/slot ownership change
- `behavior`: events, conditions, flow-affecting property updates
- `visual`: style and layout changes
- `data`: bindings and data-source changes

`ChangeGroup.type` must use the same four values.

## MVP Boundary

### Included in E-SD-01

The MVP must support:

- `AddComponent`
- `RemoveComponent`
- `MoveComponent`
- `UpdateProps`
- `UpdateEvent`
- `DiffSummary`
- grouped output by layer
- human-readable change text per semantic change
- source-reference evidence sufficient for later reviewer navigation

### Deferred beyond E-SD-01

These types remain part of the foundation contract but are not required for MVP
implementation completeness:

- `UpdateLayout`
- `UpdateStyle`
- `UpdateCondition`
- `UpdateBinding`

Rules:

- deferred types stay in the shared union so future phases do not fork the contract
- MVP implementation may leave them unproduced
- reviewer or CLI surfaces must not pretend the deferred types are supported yet

## Semantic Change Contract

The code-facing source of truth is `src/types/semantic-diff.ts`.

The contract fixes:

- `SemanticChangeType`
- `SemanticChange`
- `SemanticDiff`
- `DiffSummary`
- `ChangeGroup`
- `HumanReadableChange`
- `SemanticDiffIRNode`
- `SemanticDiffIRRoot`

Every `SemanticChange` must carry:

- `type`
- `layer`
- `componentId`
- `identityBasis`

Optional but contract-recognized fields:

- `ambiguityReason`
- `evidence`
- `humanReadable`

Rules:

- `layer` is part of the change record, not only a downstream grouping result
- `identityBasis` records why continuity was trusted
- `ambiguityReason` is present only when deterministic continuity was degraded or constrained
- `humanReadable` is attached per change, not only at group level

## Human-Readable Output Rule

Human-readable output must remain structured:

```ts
interface HumanReadableChange {
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
}
```

Rules:

- `title` is short and reviewer-facing
- `description` explains the UI meaning, not internal field names alone
- `impact` is an attention hint, not a product priority

Example:

- title: `Submit button navigation changed`
- description: `Clicking Submit now navigates to /dashboard instead of /home.`
- impact: `high`

## Diff IR Shape

`SemanticDiffIRRoot` and `SemanticDiffIRNode` are the minimum comparison surface.

Each IR node must preserve:

- stable authored anchor when present (`stableId`)
- owner scope (`ownerPath`)
- semantic slot when present (`slotName`)
- source evidence (`sourceRef`)
- comparable property surfaces:
  - `props`
  - `layout`
  - `style`
  - `events`
  - `bindings`
  - `conditions`
- ordered child structure (`children`)

Rules:

- extraction preserves authored evidence; it does not hide normalization
- normalization may canonicalize equivalent forms, but it must preserve the fields semantic diff depends on
- semantic diff compares IR nodes, not raw DSL fragments

## Identity Policy For Semantic Diff

Semantic diff reuses the broader Diff IR identity principles but narrows the
decision surface to these bases:

- `stable-id`
- `slot-anchor`
- `owner-path`
- `event-handle`
- `binding-handle`
- `fallback`

Interpretation:

- `stable-id`: explicit durable authored ID
- `slot-anchor`: semantic placement key such as a named slot
- `owner-path`: deterministic parent scope plus local ownership path
- `event-handle`: owner-scoped event anchor
- `binding-handle`: owner-scoped binding anchor
- `fallback`: deterministic but weaker continuity used only when the stronger anchors are absent

Rules:

- visible text is review context, not identity
- sibling ordinal alone is not identity
- `fallback` must still be deterministic; heuristic rescue belongs to later work

## Move And Ambiguity Rules

For the MVP:

- emit `MoveComponent` only when component continuity survives and owner or position changed
- keep reorder-only churn out of semantic output once normalization has removed the noise
- if continuity cannot be trusted with the available anchors, prefer conservative `RemoveComponent` plus `AddComponent`

Use `ambiguityReason` when the engine had to narrow or degrade continuity:

- `missing-stable-anchor`
- `multiple-candidates`
- `cross-owner-reparent`
- `fallback-required`

Rules:

- ambiguity must remain visible to downstream summary and review surfaces
- semantic diff must not silently convert ambiguous replacement into confident move or rename

## Source Reference Contract

Semantic diff uses `SemanticSourceRef` and `SemanticChangeEvidence`.

Minimum source-reference contract:

```ts
interface SemanticSourceRef {
  documentPath?: string;
  entityPath: string;
  line?: number;
  column?: number;
}
```

Rules:

- `entityPath` is required when a source side is present
- `documentPath` is optional so path-only navigation remains possible
- line and column are optional upgrades, not MVP requirements
- raw DSL blobs must not be embedded in evidence

`SemanticChangeEvidence` may carry:

- `previous`
- `next`
- `relatedPaths`
- `reasonSummary`

Mapping rule:

- use `previous` and `next` for before/after navigation
- use `reasonSummary` only for reviewer-facing diagnostic context
- preserve evidence through grouping; do not replace it with prose

## Public Contract Changes

Sprint 1 establishes these contract decisions:

- `src/types/semantic-diff.ts` is the code-facing semantic-diff foundation
- layer names are fixed to `structure / behavior / visual / data`
- semantic changes carry `identityBasis` and optional `evidence`
- the IR root schema version is fixed to `semantic-diff-ir/v1`

Future phases may extend the contract, but they must not fork these names or
redefine their meaning.

## Acceptance Criteria

Sprint 1 is complete when:

- the vocabulary in this document and `src/types/semantic-diff.ts` matches exactly
- the MVP/deferred boundary is explicit and leaves no hidden support assumptions
- the IR shape is specific enough that Sprint 2 can build extraction without new contract choices
- the source-reference contract is specific enough that Sprint 3 can add reviewer navigation without redesign

## Change History

- 2026-04-08: Initial semantic-diff MVP contract and IR guide for E-SD-01 Sprint 1.
