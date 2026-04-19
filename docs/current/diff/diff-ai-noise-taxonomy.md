# Diff AI Noise Taxonomy

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-141`

## Purpose

This document classifies AI-generated representation noise around the Diff Engine normalization boundary.

The goal is to help later Epic H and Epic J work answer two questions consistently:

- which AI-generated variations may be normalized away because they are deterministic representation drift
- which variations must remain visible because they are authored differences, structural evidence, or semantic ambiguity

## Classification Rule

Treat a pattern as normalization-eligible AI noise only when:

1. the variation is representational rather than behavioral
2. the rewrite is backed by documented equivalence or default rules
3. `sourceRef`, explicitness, ordering, and ownership evidence remain recoverable
4. the rewrite does not pre-judge structural diff or semantic summary

If any check fails, classify the pattern as preserved difference rather than normalization noise.

## Taxonomy Buckets

### `N1` Alias Drift

Definition:

- AI uses alternate field or token spellings for the same documented DSL concept.

Representative samples:

- canonical key versus documented legacy compatibility key
- short option name versus documented long option name

Normalization stance:

- normalize only when the alias is schema-documented

Do not normalize when:

- the spellings are merely semantically similar
- the difference comes from label wording or free-form text

Related rules:

- alias collapse from `docs/current/diff/diff-alias-type-nesting-rules.md`

### `N2` Primitive Representation Drift

Definition:

- AI emits the same value domain in different primitive spellings.

Representative samples:

- boolean as `true` versus `"true"`
- numeric value as `12` versus `"12"`
- documented enum alias versus canonical enum token

Normalization stance:

- normalize only when the schema fixes one value domain and the conversion is deterministic

Do not normalize when:

- the field can legally mean different types by context
- the conversion requires guessing from free text

Related rules:

- type normalization from `docs/current/diff/diff-alias-type-nesting-rules.md`

### `N3` Shorthand Versus Expanded Shape

Definition:

- AI alternates between a shorthand DSL form and a documented full object form.

Representative samples:

- scalar shorthand versus expanded object record
- compact option form versus canonical nested configuration

Normalization stance:

- normalize only when both shapes are explicitly documented as one concept

Do not normalize when:

- the expanded shape introduces ownership or placement semantics
- the projection would hide reviewer-meaningful grouping

Related rules:

- shorthand expansion and nesting normalization from `docs/current/diff/diff-alias-type-nesting-rules.md`

### `N4` Redundant Wrapper Noise

Definition:

- AI inserts empty or purely representational wrapper objects that do not change meaning.

Representative samples:

- empty wrapper around canonical record
- one extra neutral configuration layer with no placement semantics

Normalization stance:

- normalize only when the wrapper is structurally redundant and ownership-neutral

Do not normalize when:

- the wrapper carries slot, scope, parent, or grouping semantics
- flattening would erase move or reorder evidence

Related rules:

- scope boundary and nesting guardrails from `docs/current/diff/diff-normalization-scope-boundary.md`

### `N5` Explicit Default Over-Specification

Definition:

- AI writes fields explicitly even when they equal documented deterministic defaults.

Representative samples:

- explicit `false` versus omitted default-false field
- explicit default presentation mode versus omitted mode

Normalization stance:

- normalize only when explicit-versus-absent origin remains recoverable

Do not normalize when:

- omission and explicit default have different authored intent
- the default is context-sensitive or undocumented

Related rules:

- default expansion and pruning from `docs/current/diff/diff-default-expansion-pruning-rules.md`

### `N6` Duplicate Canonical Information

Definition:

- AI emits two equivalent fields or nested locations that collapse to the same canonical fact.

Representative samples:

- canonical key plus redundant alias key with the same value
- explicit default field repeated after canonical expansion

Normalization stance:

- normalize only when one representation is redundant by documented rule and authored-origin evidence can still be preserved

Do not normalize when:

- the duplicate field is the only durable trace of authored intent
- pruning would remove later debugging evidence

Related rules:

- alias collapse plus pruning composition

## Preserved Difference Buckets

The following patterns may be common in AI output but must not be normalized away.

### `P1` Structural Placement Drift

Definition:

- AI changes parent, slot, wrapper ownership, or reviewer-visible child order.

Examples:

- child moved between containers
- slot-like wrapper introduced or removed
- action list reordered alphabetically

Why preserved:

- structural diff needs this evidence for `move` and `reorder`

### `P2` Similar-Looking But Undocumented Fields

Definition:

- AI invents keys or tokens that look close to a real schema concept but are not documented equivalents.

Examples:

- `styleType` used where schema only documents `variant`
- two permission-like keys that look similar but are distinct

Why preserved:

- collapsing them would require heuristic rescue rather than deterministic normalization

### `P3` Context-Sensitive Default Guessing

Definition:

- AI omits or writes a value whose meaning depends on inherited or runtime context.

Examples:

- omitted value inherited from parent scope
- value whose absence means deferred system choice rather than explicit fixed default

Why preserved:

- normalization must not invent one context-free canonical value

### `P4` Free-Text Semantic Rephrasing

Definition:

- AI rewrites labels, text content, or free-form summaries into close but not guaranteed-equivalent wording.

Examples:

- button label paraphrase
- descriptive helper text rewritten with the same apparent intent

Why preserved:

- natural-language similarity is outside deterministic normalization

### `P5` Ownership-Flattening Nesting Changes

Definition:

- AI restructures nesting in a way that could alter grouping, parentage, or scope.

Examples:

- nested children pulled up to parent level
- scope wrapper flattened into sibling fields

Why preserved:

- ownership evidence must survive for later diff and review

## Matrix For Downstream Use

| Bucket | Sample pattern | Normalize? | Reason |
| --- | --- | --- | --- |
| `N1` | documented alias key drift | yes | deterministic vocabulary equivalence |
| `N2` | typed literal versus stringified primitive | yes | deterministic type equivalence |
| `N3` | documented shorthand versus expanded form | yes | canonical structural projection |
| `N4` | ownership-neutral wrapper noise | yes | representational redundancy only |
| `N5` | explicit deterministic default | yes | default equivalence with explicitness preserved |
| `N6` | redundant canonical duplicate | yes | documented redundancy plus preserved origin |
| `P1` | child order or parent change | no | structural diff evidence |
| `P2` | undocumented near-synonym key | no | heuristic guess, not documented equivalence |
| `P3` | inherited or context-sensitive default | no | semantic/context inference required |
| `P4` | free-text paraphrase | no | natural-language meaning judgment |
| `P5` | ownership-flattening nesting change | no | move/ownership evidence would be lost |

## Collection Guidance

When collecting future representative samples for Epic H or Epic J, record:

- the authored AI form
- the intended canonical or preserved outcome
- the bucket id from this taxonomy
- the specific B1/B2 rule family that justifies the decision
- the preserved evidence that downstream review still needs

Do not record a sample as noise-only unless its justification can be stated without referring to similarity scoring or semantic interpretation.

## Interaction With Golden Cases

This taxonomy complements `docs/current/diff/diff-normalization-golden-cases.md`.

- The golden cases define what representative normalization baselines should pass.
- This taxonomy defines how noisy AI-authored variations should be sorted into normalizable versus preserved buckets.

When both are used together:

- `N1` to `N6` should map onto positive or compositional golden cases
- `P1` to `P5` should map onto negative controls or preserved-difference fixtures

## Acceptance Criteria

This taxonomy is complete enough when:

- the main AI-induced noise forms for completed B1/B2 rule families are named
- each bucket states whether normalization is allowed
- preserved-difference buckets clearly guard deterministic boundaries
- later Epic H/J work can attach representative samples without redefining the boundary

## Change History

- 2026-03-28: Initial AI noise taxonomy for Diff Engine Epic B / Sprint B3 / `T-20260328-141`.
