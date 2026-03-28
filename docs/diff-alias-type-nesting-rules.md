# Diff Alias Type And Nesting Rules

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-139`

## Purpose

This document defines the normalization rules for:

- alias collapse
- type normalization
- nesting normalization

The goal is to reduce AI- and author-induced representational noise without rewriting structural continuity or destroying reviewer traceability.

## Core Rule

Alias, type, and nesting normalization are allowed only when the authored forms are covered by a documented equivalence rule.

They are forbidden when they:

- assume undocumented synonyms
- collapse structurally meaningful distinctions
- hide ownership, order, or placement evidence
- rescue continuity by similarity instead of deterministic equivalence

## Alias Normalization Rules

### Allowed

Alias normalization is allowed when all of the following hold:

- two or more spellings are explicitly documented as the same DSL concept
- one canonical field or token is designated as the normalized form
- collapsing the alias does not erase reviewer-relevant authored-origin evidence
- the alias is vocabulary-level, not semantic-interpretation-level

Typical allowed cases:

- synonymous field names defined by schema compatibility
- short versus long option names explicitly documented as equivalent
- legacy compatibility spellings that map to one current canonical key

### Forbidden

Alias normalization is forbidden when any of the following hold:

- the spellings are only "usually similar" rather than formally equivalent
- one spelling carries stronger or narrower semantics than the other
- alias collapse would hide a reviewer-visible distinction
- the alias relies on label text or free-form wording rather than schema identity

Typical forbidden cases:

- collapsing two labels because they are semantically close in natural language
- treating different handles as aliases without an explicit compatibility rule
- merging permission-like keys that look similar but are not schema-defined equivalents

## Type Normalization Rules

### Allowed

Type normalization is allowed when all of the following hold:

- the vocabulary already fixes the intended value domain
- the authored forms are representational variants of the same value
- the normalized result remains traceable to the authored origin
- no structural diff evidence is erased

Typical allowed cases:

- stringified boolean to boolean when the schema defines the field as boolean
- numeric string to numeric primitive when the schema defines one numeric concept
- enum aliases to one canonical enum token when the schema documents the equivalence

### Forbidden

Type normalization is forbidden when any of the following hold:

- the conversion changes interpretation rather than representation
- the field can legally represent different domains depending on context
- the conversion relies on heuristic guessing instead of schema-backed equivalence
- the original authored form may matter for review or debugging and cannot be preserved

Typical forbidden cases:

- converting free-form text into enum categories by heuristic matching
- collapsing ambiguous string-or-object fields into one type without a schema guarantee
- inferring numeric meaning from arbitrary labels or handles

## Nesting Normalization Rules

### Allowed

Nesting normalization is allowed when all of the following hold:

- multiple authored structures are documented as equivalent encodings of one concept
- canonical projection does not erase ownership or placement semantics
- source traceability remains recoverable after flattening or expansion
- the result does not interfere with canonical-order rules

Typical allowed cases:

- shorthand object wrapper expanded into the full canonical record
- canonical flattening of a purely representational nested wrapper
- collection-to-map projection when the collection is semantically unordered and key-stable

### Forbidden

Nesting normalization is forbidden when any of the following hold:

- the wrapper contributes ownership, scope, or placement semantics
- flattening would erase move or reorder evidence
- nesting shape carries reviewer-meaningful grouping
- the projection depends on undocumented inference

Typical forbidden cases:

- flattening slot or ownership wrappers
- collapsing nested structures whose grouping may explain a later diff
- reparenting children through normalization

## AI Noise Guidance

AI-generated DSL often introduces:

- alias drift
- scalar versus object drift
- redundant wrappers
- over-expanded structures

Normalization may suppress these only when the suppression uses deterministic equivalence rules.

If the AI-produced form is merely plausible rather than formally equivalent, preserve it and let later layers decide the impact.

## Deterministic Preference

When more than one normalization is possible, prefer:

1. documented canonical key
2. documented canonical value type
3. documented canonical nesting shape

Do not choose among alternatives using:

- label similarity
- reviewer-facing severity
- heuristic "looks equivalent" reasoning
- downstream diff convenience alone

## Interaction With Other Rule Families

### With canonical order

Alias, type, and nesting normalization must not reorder collections unless the canonical-order rules already permit that collection to be treated as unordered.

### With default expansion and pruning

Alias/type/nesting normalization may precede or accompany pruning only when the pruned field is redundant by documented equivalence and authored-origin evidence remains recoverable.

### With structural diff

These rules must not:

- decide same-entity continuity
- rescue rename or move detection
- flatten ownership context
- erase reviewer-visible sequence

## Rule Test

Use this test before accepting a normalization rule:

1. Is the equivalence explicitly documented?
2. Is the rewrite representational rather than interpretive?
3. Does it preserve order, ownership, and source traceability evidence?
4. Would the same rewrite remain valid without looking at another entity for comparison?
5. Does it avoid using heuristic natural-language similarity?

Only when the answers are:

- yes
- yes
- yes
- yes
- yes

should the rule be accepted.

## Examples

### Allowed example: schema alias collapse

- Input: `variant` and `styleVariant` are documented aliases
- Normalize outcome: one canonical field key
- Why allowed: equivalence is vocabulary-level and deterministic

### Allowed example: scalar-to-object shorthand expansion

- Input: shorthand scalar form documented as a short encoding of one object record
- Normalize outcome: full canonical object shape
- Why allowed: the schema already defines both forms as equivalent

### Forbidden example: semantic alias guess

- Input: two differently named fields appear similar in natural language
- Forbidden normalize outcome: collapse them into one canonical key
- Why forbidden: similarity is not documented equivalence

### Forbidden example: ownership-flattening wrapper removal

- Input: nested object indicates placement or scope
- Forbidden normalize outcome: flatten the wrapper into parent fields
- Why forbidden: ownership evidence would be lost

## Downstream Dependencies

This rule set is intended to support:

- completion of Sprint B2
- Sprint B3 golden tests and AI noise fixtures
- later Epic H noise reduction while keeping deterministic normalization boundaries intact

## Verification

- Confirm every alias rule is schema-backed rather than heuristic
- Confirm every type normalization is vocabulary-equivalent rather than interpretive
- Confirm every nesting rewrite preserves order and ownership evidence

## Change History

- 2026-03-28: Initial alias/type/nesting normalization rules for Diff Engine Epic B / Sprint B2 / `T-20260328-139`.
