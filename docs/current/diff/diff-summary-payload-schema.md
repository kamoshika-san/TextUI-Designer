# Diff Summary Payload Schema

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-161`

## Purpose

This document defines the payload schema used between structural diff / summary mapping and downstream presentation layers.

It sits between:

- `docs/current/diff/diff-summary-event-vocabulary.md` for summary category semantics
- later adapter work that maps diff result into summary input
- later PR / reviewer formatting work that renders summary payload

This page fixes:

- payload units
- grouping structure
- narrative and evidence slots
- required metadata carried across presentation boundaries

This page does not define:

- final wording templates
- UI layout or PR markdown layout
- exact diff-to-summary adapter implementation

## Design Goals

The payload schema must:

1. preserve deterministic linkage to structural evidence
2. let later formatter layers compose summary text without reinterpreting structural data
3. support both concise reviewer surfaces and richer diagnostic surfaces
4. keep category semantics and payload shape separate

## Top-Level Shape

Recommended top-level payload:

```yaml
kind: diff-summary/v0
summaryId: summary-run-001
source:
  diffResultRef: diff-result/v0
  schemaVersion: diff-result/v0
  compareStage: c1-skeleton
groups:
  - groupId: group-structure-001
    groupCategory: structure
    severity: s2-review
    narrative:
      headline: ownership changed for one stable node
      short: node moved between owner scopes
      detail: null
    evidence:
      primaryPath: /page/components/2
      relatedPaths:
        - /page/components/0
      eventIds:
        - event:component:Button:save:move
    items:
      - itemId: item-001
        category: structure-move
        severity: s2-review
        impactAxis: structure
        summaryKey: move.cross-owner
        narrativeSlot:
          actor: Save button
          action: moved
          target: sidebar actions
        evidenceSlot:
          primaryEventId: event:component:Button:save:move
          sourceRefPath: /page/components/2
          ownerPath: /page/components
metadata:
  totalItems: 1
  highestSeverity: s2-review
  containsHeuristic: false
  containsAmbiguity: false
```

## Required Top-Level Fields

Required fields:

- `kind`
- `summaryId`
- `source`
- `groups`
- `metadata`

Rules:

- `kind` is fixed to `diff-summary/v0`
- `summaryId` identifies one produced payload, not one ticket
- `groups` must be ordered for stable rendering
- `metadata` must summarize payload-wide conditions without duplicating all item details

## Source Block

Required fields:

- `source.diffResultRef`
- `source.schemaVersion`

Optional fields:

- `source.compareStage`
- `source.generatedAt`
- `source.generator`

Purpose:

- preserve a stable connection back to the structural diff payload
- allow downstream surfaces to show provenance without reading raw diff directly

Rules:

- the source block is metadata only; it must not contain raw DSL text
- later adapter work may enrich it, but these keys form the baseline

## Group Model

The payload is group-first so reviewer surfaces can collapse or expand meaningfully related changes.

Each group must contain:

- `groupId`
- `groupCategory`
- `severity`
- `narrative`
- `evidence`
- `items`

### `groupCategory`

Allowed values:

- `presentation`
- `structure`
- `behavior`
- `flow`
- `state`
- `event`
- `permission`
- `ambiguity`

Rules:

- this value is a rendering/grouping aid, not a replacement for per-item category
- all items in a group must share the same primary impact axis or a clearly compatible grouping reason

### Group Severity

Rules:

- group severity is the maximum severity among contained items
- do not downgrade a group below any contained item

## Summary Item Model

Each item is the minimum renderable semantic unit.

Required item fields:

- `itemId`
- `category`
- `severity`
- `impactAxis`
- `summaryKey`
- `narrativeSlot`
- `evidenceSlot`

Optional item fields:

- `heuristic`
- `notes`
- `relatedItemIds`

### `category`

This must use the settled values from `docs/current/diff/diff-summary-event-vocabulary.md`, for example:

- `presentation-update`
- `structure-reorder`
- `structure-move`
- `identity-rename`
- `entity-added`
- `entity-removed`
- `entity-replaced`
- `behavior-update`
- `permission-update`
- `ambiguity-warning`

### `summaryKey`

`summaryKey` is a formatter-facing stable identifier for later message templates.

Examples:

- `presentation.label-change`
- `structure.reorder.same-owner`
- `structure.move.cross-owner`
- `identity.rename.durable-handle`
- `ambiguity.remove-add-fallback`

Rules:

- `summaryKey` must remain template-oriented and stable
- `summaryKey` must not embed free-form prose

## Narrative Slot

Narrative data must be structured separately from evidence.

Required baseline fields:

- `actor`
- `action`

Optional fields:

- `target`
- `qualifier`
- `context`
- `reason`

Purpose:

- give formatter layers stable slots for prose generation
- avoid forcing formatters to parse evidence paths

Rules:

- keep values concise and presentation-ready
- do not duplicate raw evidence paths in narrative slots
- use `reason` only when the structural or semantic distinction needs explicit reviewer framing

Examples:

```yaml
narrativeSlot:
  actor: profile form
  action: reordered
  target: contact section
```

```yaml
narrativeSlot:
  actor: payment transition
  action: updated
  reason: guard condition changed
```

## Evidence Slot

Evidence data exists to support auditability and navigation.

Required baseline fields:

- `primaryEventId`
- `sourceRefPath`

Optional fields:

- `relatedEventIds`
- `ownerPath`
- `previousPath`
- `nextPath`
- `extensionHookRef`
- `sourceDocumentPath`

Rules:

- evidence slot carries structural provenance
- formatter layers may ignore some fields, but the adapter must preserve them when available
- evidence slot must not contain raw DSL payload blobs

## Payload Metadata

Required metadata fields:

- `totalItems`
- `highestSeverity`
- `containsHeuristic`
- `containsAmbiguity`

Optional fields:

- `groupCount`
- `countsByCategory`
- `countsBySeverity`

Purpose:

- support lightweight reviewer surfaces and summary badges
- enable later PR and workflow layers to detect escalation needs quickly

Rules:

- `containsHeuristic` is true when any item is heuristic-derived
- `containsAmbiguity` is true when any item reflects conservative fallback or unresolved ambiguity

## Slot Separation Rules

Always separate these concerns:

- `narrativeSlot`:
  - presentation-ready fragments
- `evidenceSlot`:
  - traceability and navigation
- `metadata`:
  - payload-wide aggregate facts

Do not:

- hide evidence-only fields inside narrative
- duplicate prose in evidence
- force formatter layers to infer severity from event IDs

## Grouping Rules

Default grouping order:

1. `ambiguity`
2. `permission`
3. `flow`
4. `state`
5. `event`
6. `structure`
7. `behavior`
8. `presentation`

Within a group:

- order by severity descending
- then by stable path or source order supplied by the adapter

Grouping guidance:

- keep a conservative fallback and its ambiguity signal in the same group
- do not mix unrelated owners in one group just because categories match
- prefer one owning path per group unless later D2 grouping rules explicitly merge them

## Heuristic And Ambiguity Flags

When an item comes from heuristic continuity:

- keep the original semantic category
- set `heuristic.derived: true`
- include `heuristic.confidence` when later adapter work exposes it

When an item represents conservative fallback:

- keep `category: entity-replaced` or `ambiguity-warning`
- ensure `metadata.containsAmbiguity` becomes true

Recommended optional shape:

```yaml
heuristic:
  derived: true
  confidence: high
```

## Attachment To Downstream Work

### D1-3 adapter work

The adapter should populate:

- `groupCategory`
- `category`
- `severity`
- `impactAxis`
- `summaryKey`
- evidence fields available from the diff result

### D2 rule work

D2 should add:

- grouping refinement
- narrative rule selection
- category-specific escalation rules

### D3 presentation work

D3 should consume:

- `summaryKey`
- `narrativeSlot`
- `evidenceSlot`
- payload metadata

without redefining the schema itself.

## Acceptance Criteria

This schema is complete enough when:

- every summary category can be represented without inventing new top-level payload sections
- formatter layers can render narrative without parsing structural evidence directly
- audit/navigation surfaces can render evidence without reconstructing it from prose
- adapter work can attach to the schema without needing to redesign grouping or metadata boundaries

## Change History

- 2026-03-28: Initial summary payload schema and narrative/evidence slot model for Diff Engine Epic D / Sprint D1 / `T-20260328-161`.
