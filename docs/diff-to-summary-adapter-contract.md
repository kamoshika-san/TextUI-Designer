# Diff To Summary Adapter Contract

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-162`

## Purpose

This document defines the adapter boundary between structural diff output and semantic summary input.

It exists to ensure that later summary work:

- consumes settled diff result evidence rather than raw DSL text
- maps structural events into summary payload mechanically
- keeps semantic-summary logic downstream from structural classification

This page fixes:

- what the adapter reads
- what the adapter emits
- which structural fields must be preserved
- which responsibilities remain out of scope for the adapter

This page does not define:

- final reviewer wording
- final PR formatting
- structural diff logic itself
- raw DSL extraction or normalization logic

## Design Goals

The adapter must:

1. preserve traceability from summary payload back to structural diff evidence
2. stay deterministic and mechanical
3. avoid reinterpreting raw DSL or hidden authored intent
4. provide enough normalized slots for later D2/D3 work without locking presentation details too early

## Boundary Position

The adapter sits here:

1. extraction and normalization produce comparison-ready IR
2. structural diff produces diff result and trace payload
3. the adapter maps diff result into summary payload input
4. summary rule and formatter layers produce grouped narrative output

Key rule:

- the adapter reads diff result only
- the adapter does not read raw DSL directly once diff result exists

## Adapter Input

The adapter input is the settled structural diff payload from Epic C.

Required input surfaces:

- diff events
- event trace payload
- entity paths and owner paths
- extension-hook references when present
- payload-level metadata needed for provenance

The adapter may read from:

- `event.kind`
- `event.entityKind`
- `event.trace`
- entity path refs already preserved in the diff result
- reserved extension hooks attached to owning units

The adapter must not require:

- original YAML text
- raw authored token order beyond what diff result already preserved
- formatter-specific templates

## Adapter Output

The adapter emits a summary payload that conforms to `docs/diff-summary-payload-schema.md`.

Minimum output responsibilities:

- create summary items
- assign stable `summaryKey`
- map primary summary category
- map severity and impact axis
- populate narrative slots with non-rendered structured fragments
- populate evidence slots with traceability fields
- populate payload/group metadata needed by downstream formatters

## Required Mapping Fields

For each mapped summary item, the adapter must derive:

- `category`
- `severity`
- `impactAxis`
- `summaryKey`
- `narrativeSlot`
- `evidenceSlot`

The adapter should also propagate:

- heuristic marker presence
- ambiguity presence
- grouping hints based on owner path and impact axis

## Mechanical Mapping Rule

The adapter should behave as a mechanical projection layer, not an interpretation layer.

That means:

- summary category comes from the settled summary vocabulary
- evidence comes from diff result paths and trace
- narrative slots are populated from already-available structural labels, not invented prose
- severity comes from fixed summary rules, not human intuition at render time

## Mapping Inputs To Outputs

Use this mapping path:

- diff event kind + entity kind + trace + extension hook context
  ->
  summary category + severity + impact axis
  ->
  summary item + group hint + payload metadata

Examples:

- structural `reorder` with deterministic continuity
  ->
  `structure-reorder`
  ->
  one summary item with structure grouping and reorder evidence

- structural `remove+add` with conservative fallback
  ->
  `entity-replaced`
  ->
  one summary item plus ambiguity metadata

- permission-conditioned hook update on stable owner
  ->
  `permission-update`
  ->
  one summary item with permission grouping and owner-scoped evidence

## Adapter Input Matrix

### 1. Event kind

Primary structural trigger:

- `add`
- `remove`
- `update`
- `reorder`
- `move`
- `rename`
- `remove+add`

Rules:

- event kind is necessary but not sufficient
- `update` requires property / extension context to choose between presentation and behavior-oriented summary categories

### 2. Entity kind

Entity kind helps the adapter decide grouping and impact axis.

Examples:

- `component` update may become `presentation-update`, `behavior-update`, or `permission-update`
- `property` update stays attached to its owning unit rather than becoming a detached top-level summary unit
- future `state` / `event` / `transition`-aware hooks should push impact into `state`, `event`, or `flow`

### 3. Trace payload

The adapter must preserve and inspect:

- `previousSourceRef`
- `nextSourceRef`
- `identitySource`
- `pairingReason`
- `fallbackMarker`
- `fallbackConfidence`
- `explicitness`

Use cases:

- heuristic-derived continuity sets heuristic markers in summary metadata
- conservative fallback sets ambiguity markers
- explicitness may influence later narrative selection, especially around defaults and removed/added properties

### 4. Extension hook context

When diff result exposes reserved extension-hook changes, the adapter should:

- keep the owning unit as the summary anchor
- set the primary impact axis according to the owning domain
- avoid inventing detached summary nodes

## Narrative Slot Population Rules

The adapter may populate narrative slots only from data already stabilized in the diff result or stable owning context.

Allowed narrative sources:

- stable actor label already known from matched entity context
- action derived from summary category
- target derived from owner path or destination path
- reason derived from structural rule outcome

Forbidden narrative sources:

- raw DSL wording parsed ad hoc from source files
- heuristic guesses about user intent
- formatter-specific prose sentences

Examples:

- allowed:
  - `actor: payment form`
  - `action: moved`
  - `target: sidebar section`
- forbidden:
  - full sentence prose generated by the adapter

## Evidence Slot Population Rules

The adapter must preserve auditability.

Required evidence inputs:

- primary event id
- sourceRef path

When available, also carry:

- owner path
- previous path
- next path
- related event ids
- extension hook ref

Rules:

- evidence fields are copied or normalized from diff result
- evidence slot must not drop ambiguity or heuristic provenance
- evidence slot must not embed raw DSL fragments

## Group Hint Rules

The adapter may emit grouping hints, but it must not hardcode final grouping policy beyond the payload contract.

Recommended group hint inputs:

- primary impact axis
- owner path
- severity
- ambiguity / heuristic flags

Recommended baseline:

- same owner path + same primary impact axis -> same provisional group
- ambiguity warnings stay with the replacement or conservative event they explain

## Heuristic And Ambiguity Propagation

When `pairingReason` or `fallbackMarker` indicate heuristic-derived continuity:

- keep the base semantic category
- set summary metadata so downstream layers know the item is heuristic-derived
- do not hide heuristic origin behind deterministic-looking fields

When fallback indicates conservative replacement:

- propagate ambiguity markers into item or payload metadata
- do not downgrade the event into generic presentation noise

## Raw DSL Prohibition

The adapter must not read raw DSL directly for summary generation once diff result exists.

Reasons:

- structural diff is already the settled interpretation boundary
- reading raw DSL again would create a second competing model
- downstream summaries would drift from reviewer-visible structural output

Allowed exception:

- none at this layer

If future work needs richer wording, it should attach through explicit payload fields or reserved hooks, not ad hoc DSL rereads.

## Non-Goals

The adapter does not:

- generate final text
- choose markdown layout
- choose which groups are collapsed by default in UI
- infer product risk beyond the settled severity rules
- redefine structural event boundaries

## Downstream Attachments

### D1-1

Provides:

- `category`
- `severity`
- `impactAxis`

### D1-2

Provides:

- payload/group/item shape
- narrative/evidence slot structure

### D2

Will add:

- grouping refinement
- narrative selection policy
- category-specific escalation detail

### D3

Will consume:

- `summaryKey`
- narrative slots
- evidence slots
- metadata flags

without redefining the adapter boundary.

## Acceptance Criteria

This adapter contract is complete enough when:

- summary layers can attach to diff result without rereading raw DSL
- every summary item field has a clear upstream source in diff result or payload rules
- heuristic and ambiguity provenance survive the adapter boundary
- later D2/D3 work can evolve rule selection and presentation without redesigning the handoff

## Change History

- 2026-03-28: Initial diff-to-summary adapter contract for Diff Engine Epic D / Sprint D1 / `T-20260328-162`.
