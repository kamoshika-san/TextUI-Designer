# Diff Normalization Golden Cases

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-140`

## Purpose

This document defines the golden normalization cases that Epic J and later regression work should use as the stable baseline for Diff Engine Epic B.

The goal is not to define executable tests yet. The goal is to pin down:

- which authored-before variants should collapse into one normalized outcome
- which rule family each case exercises
- which evidence must still remain visible after normalization

## How To Use This Baseline

Each golden case should be implemented later as a pair or set of authored inputs that:

- differ in representation before normalization
- converge to the same canonical normalized payload when the rule is allowed
- retain the required traceability metadata

Each case below therefore records:

- case id
- normalization stage
- rule family
- authored variation to include
- canonical expectation
- evidence that must remain recoverable
- non-goal boundary that the case must not cross

## Coverage Matrix

| Case ID | Stage | Rule Family | Authored variation to compare | Canonical expectation | Evidence to preserve | Must not cross |
| --- | --- | --- | --- | --- | --- | --- |
| `G-001` | Stage 1 | Canonical order | Same unordered property bag written in different key orders | Properties sorted by canonical key | `sourceRef`, authored origin per entry | Reviewer-visible child sequence normalization |
| `G-002` | Stage 1 | Canonical order | Metadata map serialized as array in two arbitrary orders | Same deterministic map-entry order | Stable entry identity, debug traceability | Reordering screen children or actions |
| `G-003` | Stage 1 | Shorthand expansion | One DSL concept in shorthand scalar form versus expanded object form | One canonical structural record | Source traceability to authored shorthand or expanded form | Semantic summary or same-entity decisions |
| `G-004` | Stage 1 | Redundant wrapper removal | Representational empty wrapper present versus omitted | Wrapper-free canonical shape | Parent ownership, authored location | Flattening placement or slot wrappers |
| `G-005` | Stage 2 | Alias collapse | Documented alias key versus canonical key | One canonical field key | Alias-origin recoverability when needed | Undocumented synonym guessing |
| `G-006` | Stage 2 | Primitive type normalization | Stringified boolean or numeric literal versus typed literal | One canonical typed value | Original authored-origin metadata | Heuristic type inference from free text |
| `G-007` | Stage 2 | Enum/value alias normalization | Two documented equivalent enum spellings | One canonical enum token | Canonicalization marker, source traceability | Collapsing merely similar labels |
| `G-008` | Stage 2 | Default expansion | Omitted deterministic default versus explicit documented default | One canonical value with explicitness metadata | Explicit-versus-absent distinction | Context-sensitive inherited default materialization |
| `G-009` | Stage 2 | Redundant field pruning | Explicit field equal to documented default versus already-pruned form | Same canonical payload after pruning | Marker that field was once explicit when needed | Dropping only evidence of authored intent |
| `G-010` | Stage 2 | Nesting normalization | Two documented equivalent nesting shapes for one concept | One canonical nesting projection | Ownership and source traceability | Reparenting or ownership flattening |
| `G-011` | Stage 2 | Alias plus pruning composition | Alias field survives until collapse, then redundant duplicate is pruned | One canonical field only | Alias-origin metadata, sourceRef | Silent loss of authored explicitness |
| `G-012` | Stage 3 | Handoff finalization | Same normalized payload produced through different allowed rule paths | One stable handoff shape for diff | `sourceRef`, explicitness, ownership, canonicalization markers | Structural diff classification in normalization |

## Representative Case Notes

### `G-001` Unordered Property Bag

Use a collection whose specification already says order is not meaningful.

The golden assertion is:

- pre-normalization order differs
- normalized key order is identical
- no reviewer-visible sequence is lost because the collection is semantically unordered

### `G-003` Shorthand Versus Expanded Form

Pick one DSL concept with a documented shorthand form and a documented full object form.

The golden assertion is:

- both inputs survive extraction distinctly
- Stage 1 projects both into one canonical object shape
- reviewer tooling can still jump back to the authored source form

### `G-008` Omitted Versus Explicit Default

Use one field with a documented deterministic default.

The golden assertion is:

- omission and explicit default converge to one canonical value
- the normalized payload still distinguishes absent-origin from explicit-origin metadata
- no ownership or sequence evidence is touched

### `G-010` Equivalent Nesting Shape

Choose a nesting case only when the equivalence is explicitly documented.

The golden assertion is:

- both authored structures normalize to one canonical projection
- ownership context remains identical after normalization
- the case does not rescue continuity across different entities

## Negative Controls

The golden baseline must also include non-normalizing controls so later tests do not accidentally widen scope.

### `NG-001` Ordered Child Sequence

- Input difference: same child nodes written in different reviewer-visible order
- Expected result: normalization preserves authored order
- Why included: guards Epic A reorder and move evidence

### `NG-002` Context-Sensitive Default

- Input difference: one field omitted where value depends on inherited context
- Expected result: no unconditional default expansion
- Why included: guards against semantic inference in normalization

### `NG-003` Undocumented Alias Guess

- Input difference: two similar-looking field names with no documented equivalence
- Expected result: no alias collapse
- Why included: guards deterministic normalization boundaries

### `NG-004` Ownership Wrapper Flattening

- Input difference: nested wrapper encodes placement or scope
- Expected result: wrapper remains or case is rejected from normalization
- Why included: guards move and ownership evidence

## Rule Family Mapping

Use this map when later turning the matrix into fixtures or test files.

| Rule family | Golden cases |
| --- | --- |
| Scope boundary and preservation guardrails | `G-001` to `G-012`, `NG-001` to `NG-004` |
| Stage 1 structural canonicalization | `G-001`, `G-002`, `G-003`, `G-004` |
| Canonical order rules | `G-001`, `G-002`, `NG-001` |
| Default expansion and pruning rules | `G-008`, `G-009`, `G-011`, `NG-002` |
| Alias, type, and nesting rules | `G-005`, `G-006`, `G-007`, `G-010`, `G-011`, `NG-003`, `NG-004` |
| Stage 3 handoff integrity | `G-012` |

## Fixture Design Guidance

When Epic J turns these cases into executable baselines, prefer this fixture shape:

1. authored input A
2. authored input B when the case is equivalence-focused
3. normalized canonical snapshot
4. metadata assertions for `sourceRef`, explicitness, and ownership
5. explicit "must not normalize" assertion for negative controls

Keep the golden fixtures narrow. One fixture should prove one rule family plus the minimum required preservation evidence.

## Acceptance Criteria For This Baseline

This baseline is complete enough when:

- every completed B1/B2 rule family has at least one positive golden case
- high-risk boundary violations have negative controls
- each case names the preserved evidence, not only the canonical output
- later teams can turn the cases into fixtures without re-deciding scope

## Downstream Consumers

This baseline is intended to unblock:

- Epic J golden snapshot and regression work
- later implementation of `normalize()` verification
- later guide consolidation in `T-20260328-142`

## Change History

- 2026-03-28: Initial golden normalization case matrix for Diff Engine Epic B / Sprint B3 / `T-20260328-140`.
