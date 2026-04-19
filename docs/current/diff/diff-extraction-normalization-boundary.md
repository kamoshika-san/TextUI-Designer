# Diff Extraction-Normalization Boundary

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-136`

## Purpose

This document defines the boundary between Diff IR extraction and normalization.

Epic A already fixed what extraction must preserve. Epic B now needs a sharper handoff contract so normalization can canonicalize representation without damaging source traceability, explicitness evidence, or later reviewer jump-back.

## Core Rule

Extraction is the preservation layer.

Normalization is the canonicalization layer.

Extraction must preserve authored evidence for later processing. Normalization may transform representation only after that evidence is safely carried forward or made recoverable.

## Extraction Responsibilities

Extraction is responsible for producing comparison-ready IR that preserves:

- IR unit typing
- authored order
- explicit versus absent distinction
- sourceRef and source-origin data
- enough structural shape for later canonicalization

Extraction may perform:

- vocabulary-level field naming into canonical IR terms
- mechanically lossless structural mapping from DSL constructs into IR units

Extraction must not perform:

- default expansion
- alias collapse
- collection reordering into canonical order
- equivalence collapse across authored variants
- reviewer-facing summary generation
- identity rescue between separate entities

## Normalization Responsibilities

Normalization is responsible for consuming extracted IR and producing a canonical comparison form for later diff work.

Normalization may perform:

- canonical ordering where order is representational noise
- alias-to-canonical key collapse
- shorthand-to-expanded form projection
- default materialization or collapse when the rule is documented
- type normalization for vocabulary-equivalent literal forms
- redundant wrapper removal when ownership and behavior are unchanged

Normalization must not perform:

- sourceRef deletion
- loss of explicit-versus-absent origin without recoverable metadata
- ownership flattening that erases move evidence
- label-based continuity rescue
- severity or semantic interpretation

## Handoff Payload

Extraction must hand normalization an IR payload that still contains:

- `sourceRef` per reviewable unit
- authored order on collections that may later matter
- explicit value evidence
- absence evidence where defaults may later be materialized
- source origin when includes or multi-file assembly are involved
- typed ownership structure for screens, nodes, states, events, and transitions

Normalization may add:

- canonical-order metadata if useful
- explicitness markers preserved alongside canonical values
- notes about which rewrite rule was applied when later debugging requires it

Normalization should not require extraction to pre-canonicalize the payload.

## Traceability Requirements

The following traceability constraints are non-negotiable across the boundary:

- reviewer jump-back to authored location must remain possible after normalization
- merged equivalent values must still be traceable to their authored source
- downstream diff must be able to explain whether a value was originally explicit or absent
- future UI and workflow tooling must not need to reconstruct source mapping from raw DSL again

If a normalization rule would make these impossible, the rule is invalid or needs extra metadata to preserve the evidence.

## Evidence Classes

### Must stay intact from extraction into normalization

- document identity
- source range or equivalent stable location
- ownership path / DSL object path when available
- authored sequence for possibly meaningful collections
- authored explicitness

### May be canonically rewritten by normalization

- vocabulary-equivalent primitive forms
- order of unordered property collections
- redundant wrapper shape
- shorthand schema spelling

### Must stay outside both layers until later diff work

- continuity classification across entities
- similarity matching for missing IDs
- move / reorder / remove-plus-add decisions
- semantic severity interpretation

## Boundary Tests

Use these checks when deciding whether work belongs to extraction or normalization.

### Extraction-side check

Ask:

1. Is this required to preserve what the author wrote or where it came from?
2. Is this a mechanically lossless mapping into IR vocabulary?
3. Would delaying this step to normalization risk losing authored evidence?

If yes, the work belongs in extraction.

### Normalization-side check

Ask:

1. Is this only about collapsing equivalent representation?
2. Can the rule be documented without talking about structural continuity?
3. Can source traceability and explicitness survive the rewrite?

If yes, the work belongs in normalization.

### Neither-layer check

Ask:

1. Does this influence same-entity continuity?
2. Does this classify impact, meaning, or reviewer importance?
3. Does this depend on comparing two authored structures rather than one payload?

If yes, the work belongs downstream of normalization.

## Examples

### Extraction example: preserve authored absence

- Input: one DSL author omits a property entirely
- Extraction result: the property remains absent, with surrounding structure preserved
- Why extraction owns it: authored absence is evidence that normalization may later reason about

### Normalization example: materialize documented default

- Input: one IR payload has no explicit value, another has the documented default explicitly
- Normalization result: both canonicalize to one comparison value, while explicitness metadata remains recoverable
- Why normalization owns it: the rewrite collapses representation noise after extraction preserved the evidence

### Downstream example: continuity judgment

- Input: two components have similar text but different ownership paths and no stable ID
- Outcome: extraction preserves both, normalization may canonicalize internal property forms, but continuity judgment stays for structural diff
- Why not here: the decision compares entities and affects remove-plus-add versus same-node interpretation

## Downstream Dependencies

This boundary is intended to support:

- `T-20260328-135`: normalization stage design
- later canonical-order work in `T-20260328-137`
- Epic C structural diff without loss of move/reorder evidence
- Epic J test design that needs stable source mapping assumptions

## Verification

- Confirm extraction remains a preservation layer rather than an early normalization pass
- Confirm normalization remains a canonicalization layer rather than a continuity classifier
- Confirm sourceRef, authored order, and explicitness remain preserved or recoverable after handoff

## Change History

- 2026-03-28: Initial extraction-normalization boundary for Diff Engine Epic B / Sprint B1 / `T-20260328-136`.
