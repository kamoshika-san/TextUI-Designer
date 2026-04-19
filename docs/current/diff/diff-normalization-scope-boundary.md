# Diff Normalization Scope Boundary

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-134`

## Purpose

This document defines what normalization is allowed to rewrite, what it must preserve, and what belongs to later diff or semantic layers.

Epic A fixed the extraction contract, identity policy, and structural classification boundaries. Epic B now needs a stable normalization scope so later `normalize()` design does not absorb structural diff decisions or reviewer-facing semantic judgment.

## Design Rule

Normalization may rewrite authored forms only when the rewrite is intended to collapse equivalent representation without deciding structural continuity or semantic impact.

Normalization must not:

- decide add / remove / move / reorder / rename outcomes
- rescue identity for missing-ID entities
- classify severity or reviewer importance
- rewrite source traceability away
- convert behaviorally distinct configurations into one canonical shape

## Input Assumptions

Normalization consumes extracted IR that already preserves:

- authored ordering
- explicit versus absent values
- source references
- structural unit typing

Those guarantees come from `docs/current/diff/diff-ir-extraction-contract.md` and are preconditions for safe normalization.

## Scope Categories

### 1. In scope: representation-only rewrite

Normalization may rewrite these categories when the meaning is unchanged:

- canonical ordering of collections that were authored in arbitrary order but represent unordered meaning
- alias collapse where two field names are explicitly defined as the same vocabulary-level concept
- type canonicalization such as stringified primitive forms into one internal primitive form
- explicit default expansion or default collapse, as long as explicitness metadata remains recoverable
- removal of redundant wrapper shape when the wrapper does not introduce ownership, ordering, or behavior
- canonical field naming that is mechanically lossless

These rewrites are allowed because they reduce representational noise without deciding whether two entities are the same logical unit.

### 2. Conditionally in scope: equivalence rewrite with guardrails

Normalization may touch these categories only when the equivalence rule is explicit and reversible enough for review tooling:

- property maps whose authored order is presentation noise rather than semantic sequence
- nested configuration forms that have one agreed canonical projection
- omitted values that can be materialized from a documented default table
- shorthand versus expanded syntax for the same DSL concept

Guardrails:

- the rule must be documented
- sourceRef must remain usable
- explicit versus absent intent must not be lost irreversibly
- the rewrite must not hide a later diff classification boundary

### 3. Out of scope: structural continuity decisions

Normalization must not decide:

- whether a sibling order change is `reorder`
- whether a parent or slot change is `move`
- whether wording change is same-entity update versus remove-plus-add
- whether two missing-ID nodes should be matched heuristically
- whether a screen split should be represented as one-to-many continuity

Those belong to structural diff and are already bounded by the Epic A policy documents.

### 4. Out of scope: semantic and review interpretation

Normalization must not decide:

- whether a change is behavioral or cosmetic
- whether permission impact is high-risk
- whether a transition change is review-critical
- whether a UI difference should be summarized in natural language

Those belong to semantic summary, UI, or workflow layers.

## Allowed Rewrite Inventory

The following inventory is the working baseline for Epic B.

### Allowed

- canonical sort of unordered property bags
- alias-to-canonical key conversion
- numeric / boolean / enum literal normalization when vocabulary-equivalent
- shorthand expansion for one DSL concept
- explicit default materialization with explicitness metadata preserved
- removal of representationally redundant empty wrappers

### Allowed only with documented default or equivalence table

- absent-to-default expansion
- one-of-many synonymous schema spellings
- flattening nested config forms into one canonical record

### Forbidden

- label rewriting intended to make two entities appear identical
- stable-handle rewriting intended to rescue rename continuity
- parent or slot rewriting that would erase move evidence
- child-order rewriting on collections where reviewer-visible sequence matters
- collapse of distinct permission, state, event, or transition structures into one generic blob
- removal of sourceRef, authored-order, or explicitness evidence

## How To Judge New Cases

Use this test in order:

1. Is the authored difference only representational?
2. Can the rewrite be justified by a documented equivalence rule?
3. Does the rewrite preserve source traceability and explicitness metadata?
4. Would the rewrite erase evidence needed for structural diff classification?
5. Would the rewrite pre-judge a reviewer-facing semantic conclusion?

A new rule is normalization-safe only if the answers are:

- yes
- yes
- yes
- no
- no

If any answer fails, the case belongs outside normalization.

## Boundary Examples

### Allowed example: alias collapse

- Before: two DSL spellings map to the same IR property concept
- Normalize outcome: one canonical property key
- Why allowed: the rewrite is vocabulary-level and does not affect identity or structural continuity

### Allowed example: default expansion with metadata

- Before: one author omits a value, another writes the documented default explicitly
- Normalize outcome: one canonical value plus metadata that preserves explicit-versus-absent origin
- Why allowed: the goal is to suppress representation noise while keeping reviewer traceability

### Forbidden example: label-based continuity rescue

- Before: two nearby components share similar text but lack deterministic identity
- Forbidden normalize outcome: rewriting labels or local structure to make them compare as the same node
- Why forbidden: this steals work from structural diff and heuristic matching policy

### Forbidden example: move evidence erasure

- Before: a component changes parent scope
- Forbidden normalize outcome: flattening ownership context so the node appears unchanged
- Why forbidden: this destroys `move` evidence that Epic C must classify

## Downstream Dependencies

This boundary is intended to unlock:

- `T-20260328-135`: normalization stage design
- `T-20260328-137`: canonical ordering rules
- later Epic C implementation without normalization absorbing diff logic
- later Epic H noise-reduction work without rewriting deterministic diff boundaries

## Verification

- Confirm every allowed rewrite category is representational rather than structural
- Confirm every forbidden category would otherwise erase evidence needed by Epic A diff policy
- Confirm explicitness and source traceability remain first-class constraints

## Change History

- 2026-03-28: Initial normalization scope boundary for Diff Engine Epic B / Sprint B1 / `T-20260328-134`.
