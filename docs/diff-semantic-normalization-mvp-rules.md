# Semantic Diff MVP Normalization Rules

Updated: 2026-04-08
Owner: Maintainer
Related tickets: `T-20260408-733`, `T-20260408-734`

## Purpose

This document narrows the existing normalization policy documents to the exact
subset required by `E-SD-01` Sprint 1 and Sprint 2.

It fixes:

- which normalization rules the semantic diff MVP relies on immediately
- which rule families are deliberately deferred
- which golden fixture seeds must exist before Sprint 2 semantic diff work starts

This document does not replace:

- `docs/diff-normalization-spec-and-guide.md`
- `docs/diff-canonical-order-rules.md`
- `docs/diff-default-expansion-pruning-rules.md`
- `docs/diff-normalization-golden-cases.md`
- `docs/diff-normalization-fixture-shape.md`

It is the semantic-diff MVP narrowing layer for those documents.

## Canonical Inputs

Read this document together with:

- `docs/diff-semantic-mvp-contract-and-ir.md`
- `docs/diff-normalization-spec-and-guide.md`
- `docs/diff-canonical-order-rules.md`
- `docs/diff-default-expansion-pruning-rules.md`
- `docs/diff-normalization-golden-cases.md`
- `docs/diff-normalization-fixture-shape.md`

## MVP Normalization Goal

For the semantic diff MVP, normalization exists to remove representation noise
without erasing the evidence needed for:

- `AddComponent`
- `RemoveComponent`
- `MoveComponent`
- `UpdateProps`
- `UpdateEvent`

The semantic diff MVP normalization subset must therefore:

- suppress reorder-only noise only for semantically unordered collections
- preserve reviewer-visible child sequence
- preserve screen scope, ownership, and slot evidence
- preserve explicit-versus-absent value origin through `SemanticDiffIRValue`

## Included Rule Families

### 1. Canonical order for unordered property surfaces

Allowed only for:

- unordered property bags
- metadata maps treated as key-value sets
- event/property maps whose order is not reviewer-visible

Forbidden for:

- screen child arrays
- container child arrays
- action lists
- form-field sequence
- any collection whose order could later produce `MoveComponent` or visible reorder meaning

MVP effect:

- reorder-only noise in unordered maps becomes a no-op
- reviewer-visible component order stays authored

### 2. Deterministic default convergence

Allowed only when:

- the default is documented and deterministic
- omission and explicit default are semantically equivalent
- explicitness stays recoverable as `explicit` versus `absent`

MVP effect:

- prop-only noise from explicit documented defaults is suppressed
- later semantic diff still knows whether the authored value was omitted or explicit

### 3. Shorthand versus expanded form equivalence

Allowed only for documented equivalence such as:

- scalar shorthand versus expanded object form for the same layout/property concept

MVP effect:

- equivalent layout/property syntax does not become a false `UpdateProps`

### 4. Negative boundary preservation

The MVP must also keep at least one hard negative control to prove normalization
does not over-collapse:

- reviewer-visible ordered actions must remain non-equivalent

This guards Sprint 2 against incorrectly suppressing a real structural or UX change.

## Deferred Rule Families

The semantic diff MVP does not require new normalization work for:

- alias guessing outside documented equivalence
- context-sensitive inherited defaults
- wrapper flattening that might affect ownership or placement
- heuristic rescue of similar shapes
- value coercion from free text

If a Sprint 2 implementation needs one of these, it must come back through PM as
scope expansion rather than being silently added.

## Required Fixture Seed Set

Sprint 1 requires these fixture seeds under `tests/fixtures/normalization-golden/`:

| Fixture ID | Mode | Purpose |
| --- | --- | --- |
| `SD-N001` | `equivalent` | unordered property/event map reorder becomes a no-op |
| `SD-N002` | `equivalent` | omitted documented default converges with explicit default |
| `SD-N003` | `equivalent` | shorthand versus expanded padding form converges |
| `SD-N004` | `non-equivalent` | reviewer-visible action order must stay different |

Rules:

- each fixture proves one rule family plus the minimum preservation evidence
- positive fixtures include a canonical normalized snapshot
- the negative control omits the normalized snapshot and states why collapse is forbidden

## Fixture Naming And Location

Use this repository-local layout:

```text
tests/fixtures/normalization-golden/
  SD-N001/
  SD-N002/
  SD-N003/
  SD-N004/
```

Each fixture directory must contain:

- `fixture.yml`
- one or more authored `.tui.yml` inputs
- `normalized.snapshot.yml` only for `equivalent` fixtures

This is a semantic-diff MVP seed set, not the final exhaustive Epic J catalog.

## Preservation Requirements

Every positive fixture must explicitly preserve:

- `sourceRef`: `not-applicable` is acceptable for seed DSL fixtures without line mapping
- `explicitness`: `preserve` when omission-versus-explicit origin matters
- `ownership`: `preserve`

For this Sprint 1 seed set:

- `SD-N001`: preserve `ownership`, treat `explicitness` as `not-applicable`
- `SD-N002`: preserve `explicitness` and `ownership`
- `SD-N003`: preserve `ownership`, treat `explicitness` as `not-applicable`
- `SD-N004`: preserve `ownership` and forbid collapse of reviewer-visible order

## Acceptance Criteria

This ticket slice is complete when:

- the semantic diff MVP normalization subset is documented without contradicting the broader normalization guides
- the four required fixture seeds exist with valid manifest structure
- fixture names and expectations are directly reusable by Sprint 2 and later Epic J work
- the negative control makes the scope boundary obvious

## Change History

- 2026-04-08: Initial semantic diff MVP normalization subset and fixture seed rules for E-SD-01 Sprint 1.
