# Diff Canonical Order Rules

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-137`

## Purpose

This document defines where normalization may apply canonical ordering and where authored order must remain intact.

Canonical order is valuable for noise reduction, but it is also dangerous because reordering the wrong collection can erase evidence needed by structural diff. This rule set keeps those concerns separate.

## Core Rule

Canonical ordering is allowed only for collections whose order is representational noise.

Canonical ordering is forbidden for collections whose sequence contributes to:

- reviewer-visible layout or flow
- reorder detection
- move detection
- ownership or placement semantics

## Classification Test

Ask these questions in order for a collection:

1. Does order change the rendered or reviewer-visible sequence?
2. Does order participate in ownership, slot placement, or structural continuity?
3. Would reordering erase evidence that later diff needs to classify `reorder` versus `move`?
4. Is the collection logically a set, map, or bag rather than a sequence?

Canonical ordering is allowed only when the answers are:

- no
- no
- no
- yes

If any earlier answer is yes, the collection must retain authored order through normalization.

## Allowed Canonical Order Targets

Canonical order is allowed for collections like:

- unordered property bags
- metadata maps expressed as arrays but semantically treated as key-value sets
- declarative option lists whose specification explicitly says order is not meaningful
- internally grouped rewrite-rule tables used only as normalization support metadata

Conditions:

- the DSL or IR contract must treat the collection as unordered
- canonical sort keys must be deterministic and documented
- sourceRef and authored evidence must remain recoverable when needed for debugging

## Forbidden Canonical Order Targets

Canonical order is forbidden for collections like:

- child node arrays in screens or containers
- named-slot child collections when slot-local sequence is meaningful
- tab, step, breadcrumb, action, or menu items whose order is reviewer-visible
- state lists when authored order can affect review interpretation
- transition lists when authored order may matter for reviewer traceability
- any collection already used by structural diff to detect reorder

These collections must retain authored order so later comparison can decide whether the change is meaningful.

## Special Cases

### Same data, different presentation role

A structurally similar collection may be canonicalizable in one context and non-canonicalizable in another.

Example:

- an internal property bag represented as entries: canonical order allowed
- a user-visible action list represented with the same array syntax: canonical order forbidden

The deciding factor is semantic role, not surface syntax alone.

### Keyed maps serialized as arrays

If the authored DSL serializes an unordered keyed map as an array, normalization may canonicalize it only when:

- each entry has stable key identity
- the collection is semantically unordered
- the sort key does not erase reviewer-visible sequence meaning

### Fallback when uncertain

When the role of a collection is uncertain, preserve authored order.

False negatives are safer here than false positives because unnecessary order preservation creates noise, but incorrect canonicalization destroys comparison evidence.

## Sort-Key Guidance

When canonical ordering is allowed, sort keys should prefer:

1. documented stable key or canonical property name
2. deterministic vocabulary-level identifier
3. stable tuple order when multiple canonical fields are required

Sort keys must not depend on:

- display label alone
- generated similarity score
- source range
- semantic severity

These would either be unstable or would leak later-layer concerns into normalization.

## Interaction With Structural Diff

Structural diff still owns:

- sibling reorder detection
- move detection
- same-entity continuity decisions

Normalization must not canonicalize away the evidence structural diff uses for those decisions.

Practical consequence:

- child node order remains authored order
- slot-local sequence remains authored order when it can affect review
- only unordered collections are canonicalized

## Interaction With Pipeline Stages

Canonical ordering belongs in:

- Stage 1 structural canonicalization from `docs/current/diff/diff-normalization-pipeline-stages.md`

It must not be deferred into value-equivalence stages, and it must not be introduced in extraction.

## Examples

### Allowed example: property bag

- Input: properties serialized in arbitrary author order
- Normalize outcome: entries sorted by canonical property key
- Why allowed: the bag is semantically unordered and does not encode reviewer-visible sequence

### Forbidden example: action row

- Input: primary and secondary actions appear in authored sequence
- Forbidden normalize outcome: alphabetical sort by action key
- Why forbidden: the sequence is visible and may later produce a real `reorder`

### Forbidden example: form fields

- Input: field array in page order
- Forbidden normalize outcome: sort by field id
- Why forbidden: this would erase the evidence needed to distinguish layout order changes from no-op noise

## Downstream Dependencies

This rule set is intended to support:

- `T-20260328-138` by clarifying which omitted/default fields may be normalized without disturbing order evidence
- `T-20260328-139` by separating alias/type/nesting normalization from order normalization
- Epic C move/reorder logic by preserving authored sequence where required

## Verification

- Confirm every allowed target is semantically unordered
- Confirm every forbidden target would otherwise risk destroying reorder or move evidence
- Confirm uncertain cases default to authored order preservation

## Change History

- 2026-03-28: Initial canonical order rule set for Diff Engine Epic B / Sprint B2 / `T-20260328-137`.
