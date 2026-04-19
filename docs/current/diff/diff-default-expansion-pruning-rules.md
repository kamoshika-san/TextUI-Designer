# Diff Default Expansion And Field Pruning Rules

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-138`

## Purpose

This document defines when normalization may materialize documented defaults and when it may prune redundant fields.

The goal is to reduce representation noise without destroying the evidence that later diff and review layers need.

## Core Rule

Default expansion and field pruning are allowed only when they collapse representation-equivalent forms.

They are forbidden when they:

- erase explicit-versus-absent evidence irreversibly
- erase order evidence needed by structural diff
- erase ownership or placement context
- hide behaviorally meaningful differences behind an undocumented default assumption

## Default Expansion Rules

### Allowed

Default expansion is allowed when all of the following hold:

- the default value is documented and deterministic
- the omitted form and explicit default form are semantically equivalent
- explicit-versus-absent origin remains recoverable after normalization
- expanding the default does not hide later structural diff evidence

Typical allowed cases:

- omitted boolean flag whose documented default is `false`
- omitted enum-like field with a fixed schema default
- omitted presentation option whose explicit default spelling is already standardized

### Forbidden

Default expansion is forbidden when any of the following hold:

- the default is context-sensitive or inferred from runtime state
- omission carries reviewer-meaningful intent distinct from explicit default
- the field influences ownership, ordering, slot placement, or structural continuity
- the default table is undocumented or ambiguous

Typical forbidden cases:

- a value that inherits from parent context and may change when nesting changes
- a field whose absence means "system decides later" while explicit default means "author fixed the value"
- any field whose expansion would blur remove-plus-add versus same-entity interpretation

## Field Pruning Rules

### Allowed

Field pruning is allowed when all of the following hold:

- the field is redundant under a documented default or canonical-equivalence rule
- removing it does not lose source traceability to the authored evidence
- the normalized payload still preserves whether the field was originally explicit when that fact matters
- the field does not carry structural placement or continuity evidence

Typical allowed cases:

- explicit field equal to the documented default when explicitness metadata is retained separately
- duplicated canonical alias field after alias collapse
- empty wrapper-level configuration field made redundant by canonical shape rules

### Forbidden

Field pruning is forbidden when any of the following hold:

- the field is the only durable evidence of authored intent
- the field helps explain move, reorder, or ownership changes
- the field is needed for reviewer jump-back or future debugging
- the field is only "probably redundant" rather than redundant by rule

Typical forbidden cases:

- authored slot or ownership indicators
- explicitly provided values that alter interpretation even if they match a common fallback
- structural fields that are later used to explain comparison outcomes

## Explicit Versus Absent Preservation

Default expansion and pruning must preserve the following distinction:

- value was explicitly authored
- value was absent and later materialized from a default rule

Allowed preservation strategies include:

- explicitness metadata attached to the normalized field
- side metadata that records the origin of the canonical value
- pruning markers that preserve whether a removed field existed in authored form

Forbidden strategy:

- silently replacing absent and explicit forms with one undifferentiated canonical value when reviewer tooling may later need the distinction

## Interaction With Canonical Order

Default expansion and pruning must not change collection ordering rules.

Practical guardrails:

- do not prune fields in a way that implicitly reorders authored child collections
- do not materialize defaults that cause unordered and ordered collections to be treated the same
- do not use pruning to collapse sequence-bearing structures into unordered bags

## Interaction With Structural Diff

Structural diff still owns:

- same-entity continuity
- move versus reorder classification
- add / remove / update decisions

Therefore default expansion and pruning must not:

- erase ownership context
- erase slot context
- erase reviewer-visible sequence
- rewrite labels or handles to rescue continuity

## Rule Test

Use this test before adding a default or pruning rule:

1. Is there a documented deterministic default or equivalence rule?
2. Are the omitted and explicit forms behaviorally equivalent?
3. Can explicit-versus-absent origin remain recoverable?
4. Does the rewrite preserve structural diff evidence?
5. Does the rewrite avoid reviewer-facing semantic judgment?

Only when the answers are:

- yes
- yes
- yes
- yes
- yes

should the rule be accepted.

## Examples

### Allowed example: explicit default collapse

- Input A: field omitted
- Input B: same field explicitly set to documented default
- Normalize outcome: one canonical value, plus metadata preserving whether the field was explicit
- Why allowed: representation noise is reduced without losing authored-origin evidence

### Allowed example: redundant canonical alias removal

- Input: two equivalent field spellings survive until alias collapse
- Normalize outcome: canonical field retained, redundant alias removed, alias-origin preserved if needed
- Why allowed: the field is redundant by documented equivalence

### Forbidden example: contextual inherited default

- Input: omitted field inherits from parent configuration
- Forbidden normalize outcome: materialize one assumed default unconditionally
- Why forbidden: the value is context-sensitive and may change interpretation when structure changes

### Forbidden example: slot-like field pruning

- Input: field indicates placement inside a semantic region
- Forbidden normalize outcome: drop the field as "redundant"
- Why forbidden: structural diff may need that evidence to explain move or ownership changes

## Downstream Dependencies

This rule set is intended to support:

- completion of Sprint B2
- later B3 golden tests for representation-equivalent DSL
- later Epic H noise suppression without weakening deterministic diff boundaries

## Verification

- Confirm every expansion rule is backed by a documented deterministic default
- Confirm every pruning rule preserves authored-origin evidence when needed
- Confirm no rule destroys ordering, ownership, or continuity evidence

## Change History

- 2026-03-28: Initial default expansion and field pruning rules for Diff Engine Epic B / Sprint B2 / `T-20260328-138`.
