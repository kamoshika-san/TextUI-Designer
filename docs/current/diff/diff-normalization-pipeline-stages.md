# Diff Normalization Pipeline Stages

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-135`

## Purpose

This document defines the normalization pipeline stages and the responsibility boundary for each stage.

Epic B already fixed:

- what normalization may and may not rewrite
- what extraction must preserve before normalization begins

The remaining step is to describe how normalization work is sequenced so later rule tickets can attach to a stable pipeline instead of inventing overlapping phases.

## Design Goals

The pipeline must:

- preserve source traceability throughout normalization
- keep explicit-versus-absent evidence recoverable
- avoid hiding structural diff evidence
- provide stable attachment points for later rule families

The pipeline must not:

- absorb structural diff classification
- mix semantic interpretation into canonicalization
- require extraction to pre-normalize the payload

## Stage Model

The baseline normalization pipeline has four stages.

### Stage 0: Intake and preservation check

Purpose:

- validate that the extracted IR contains the evidence normalization requires
- keep the pipeline honest about what must survive all later rewrites

Consumes:

- extracted IR
- sourceRef
- authored order
- explicit / absent evidence
- source-origin metadata when present

Produces:

- normalization-ready IR that is still fully authored in shape
- preservation guarantees recorded as stage assumptions

Allowed work:

- structural validation of required metadata presence
- attaching internal bookkeeping flags that do not rewrite authored meaning

Forbidden work:

- canonical reordering
- alias collapse
- default materialization
- wrapper flattening

Why this stage exists:

- later stages should not silently discover that required evidence was already lost

### Stage 1: Structural canonicalization

Purpose:

- normalize representation-only structure that does not depend on default tables or semantic interpretation

Consumes:

- preservation-checked IR from Stage 0

Produces:

- structurally canonical IR shape with authored evidence still preserved or recoverable

Allowed work:

- canonical ordering of collections that are explicitly defined as unordered
- canonical field naming
- shorthand-to-expanded structural projection
- removal of redundant wrapper shape when ownership and behavior are unchanged

Forbidden work:

- any rewrite that erases meaningful authored sequence
- any change that flattens ownership and would hide move evidence
- any continuity judgment across entities

Primary downstream rules:

- `T-20260328-137`
- later alias / nesting rules that depend on stable shape

### Stage 2: Value equivalence canonicalization

Purpose:

- collapse vocabulary-equivalent value forms while preserving authored intent metadata

Consumes:

- structurally canonical IR from Stage 1

Produces:

- value-canonical IR plus recoverable evidence of authored explicitness

Allowed work:

- primitive type normalization
- alias-to-canonical key collapse when the equivalence is documented
- enum or scalar normalization where the vocabulary is already fixed
- default materialization or collapse when explicitness metadata remains recoverable
- pruning of fields that are redundant only under documented default/equivalence rules

Forbidden work:

- deleting the fact that a value was originally absent
- deleting traceability to the authored source
- introducing reviewer-facing severity or meaning labels

Primary downstream rules:

- `T-20260328-138`
- `T-20260328-139`

### Stage 3: Handoff finalization

Purpose:

- prepare the canonicalized payload for structural diff and later tooling without reinterpreting it

Consumes:

- canonical IR from Stages 1 and 2

Produces:

- normalized IR ready for structural diff
- preserved metadata needed for reviewer jump-back and debugging

Allowed work:

- packaging canonical IR plus metadata into the agreed handoff shape
- carrying forward canonicalization markers when later debugging needs to know which rule families ran
- final integrity checks on sourceRef, explicitness metadata, and ownership structure

Forbidden work:

- same-entity continuity decisions
- move/reorder classification
- semantic summary text
- severity classification

Why this stage exists:

- it keeps canonicalization separate from the later comparison engine while still giving downstream layers a clean, stable payload

## Stage Boundaries

### Between Stage 0 and Stage 1

The boundary is:

- "do we already have enough authored evidence to normalize safely?"

If not, the issue belongs back at extraction or in validation, not in ad hoc Stage 1 rewriting.

### Between Stage 1 and Stage 2

The boundary is:

- "is this rewrite structural shape or value equivalence?"

If the rewrite depends on default tables, synonymous values, or pruning semantics, it belongs in Stage 2, not Stage 1.

### Between Stage 2 and Stage 3

The boundary is:

- "is this still canonicalization, or is it already comparison interpretation?"

Anything that starts deciding continuity or reviewer meaning is outside normalization entirely.

## Rule Attachment Map

Use the following map for later tickets:

- Stage 0
  - preservation assertions
  - sourceRef / explicitness / authored-order integrity checks
- Stage 1
  - canonical order rules
  - shape normalization
  - redundant wrapper handling
- Stage 2
  - default expansion and collapse
  - redundant-field pruning
  - alias, type, and nested value equivalence rules
- Stage 3
  - normalized payload handoff and metadata integrity checks

## Non-Goals

This pipeline does not define:

- specific canonical order rules for each collection type
- specific default tables
- specific alias dictionaries
- specific diff event names
- semantic summary generation

Those belong to downstream rule tickets or later epics.

## Verification

- Confirm each stage has one clear purpose
- Confirm no stage performs structural diff or semantic-summary work
- Confirm later rule tickets can attach to one stage without overlapping responsibility

## Change History

- 2026-03-28: Initial normalization pipeline stage model for Diff Engine Epic B / Sprint B1 / `T-20260328-135`.
