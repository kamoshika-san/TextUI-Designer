# Diff Summary Event Vocabulary

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-160`

## Purpose

This document defines the semantic-summary event vocabulary that sits downstream from structural diff.

It exists to translate settled structural outcomes from Epic C into reviewer-facing summary units without:

- reinterpreting raw DSL directly
- overriding deterministic structural classification
- inventing a second comparison model

This page fixes:

- summary event categories
- severity and impact axes
- mapping guardrails from structural diff into summary units

This page does not define:

- final payload schema
- final PR or reviewer UI formatting
- exact wording templates

## Design Goals

The vocabulary must:

1. compress structural diff events into reviewable semantic groups
2. preserve a deterministic link back to structural evidence
3. stay conservative when ambiguity remains
4. support later D1 payload/schema work and D2 narrative grouping work

## Summary Unit

One summary event represents one reviewer-meaningful change statement derived from one or more structural diff events that share the same interpretation boundary.

A summary event must always stay attributable to:

- one primary structural category
- one severity axis value
- one owning path or extension hook scope

## Severity Model

Severity is not a product priority. It is a reviewer-attention signal for how strongly the diff changes structure, flow, or behavioral meaning.

Use these fixed severity levels:

- `s0-minor`
- `s1-notice`
- `s2-review`
- `s3-critical`

Interpretation:

- `s0-minor`: low-risk wording or metadata changes that rarely change reviewer intent
- `s1-notice`: meaningful but localized structural or semantic changes
- `s2-review`: changes that likely affect behavior, navigation, ownership, or extension semantics
- `s3-critical`: changes that are conservative fallbacks, high-ambiguity outcomes, or major flow breaks requiring explicit reviewer attention

## Impact Axis

Severity alone is not enough for grouping. Every summary event should also map to one primary impact axis:

- `presentation`
- `structure`
- `behavior`
- `flow`
- `state`
- `event`
- `permission`
- `ambiguity`

Rules:

- use exactly one primary impact axis per summary event
- later payload work may add secondary axes, but this vocabulary only fixes the primary axis

## Summary Event Categories

### 1. `presentation-update`

Use when:

- a stable entity keeps continuity
- the change is display-facing or descriptive
- structural ownership and flow do not change

Typical structural sources:

- property-only label change
- body text rewrite
- title, caption, helper-text, or placeholder change

Default severity:

- `s0-minor`

Impact axis:

- `presentation`

Must not absorb:

- durable-handle rename
- move
- remove-plus-add

### 2. `structure-reorder`

Use when:

- the same logical entity remains under the same owner and slot
- relative order among siblings changes

Typical structural sources:

- deterministic `reorder`
- bounded heuristic rescue that still resolves to reorder

Default severity:

- `s1-notice`

Impact axis:

- `structure`

Severity escalation:

- escalate to `s2-review` when reviewer-visible order is the main output surface

Must not absorb:

- cross-slot relocation
- cross-parent relocation

### 3. `structure-move`

Use when:

- entity continuity survives
- parent scope or slot ownership changes

Typical structural sources:

- deterministic `move`

Default severity:

- `s2-review`

Impact axis:

- `structure`

Must not absorb:

- reorder inside the same owner
- remove-plus-add caused by broken continuity

### 4. `identity-rename`

Use when:

- a durable handle changes on an already-matched entity
- the rename is semantically meaningful beyond display copy

Typical structural sources:

- rename-capable state handle change
- rename-capable event handle change
- rename-capable semantic slot alias

Default severity:

- `s1-notice`

Impact axis:

- `behavior`

Severity escalation:

- escalate to `s2-review` when downstream references or transitions depend on the renamed handle

Must not absorb:

- label-only presentation changes
- wording-only replacements without deterministic identity

### 5. `entity-added`

Use when:

- a new entity appears without continuity to a prior one

Typical structural sources:

- structural `add`
- transition added
- new state or event declaration added under stable owner scope

Default severity:

- `s1-notice`

Primary impact axis:

- choose by owning unit:
  - `flow` for transition adds
  - `state` for state adds
  - `event` for event adds
  - `structure` otherwise

### 6. `entity-removed`

Use when:

- an existing entity disappears without continuity to a next-side counterpart

Typical structural sources:

- structural `remove`
- transition removed
- state or event removed under stable owner scope

Default severity:

- `s2-review`

Primary impact axis:

- choose by owning unit:
  - `flow` for transition removes
  - `state` for state removals
  - `event` for event removals
  - `structure` otherwise

### 7. `entity-replaced`

Use when:

- the structural layer emitted conservative `remove+add`
- reviewer trust depends on showing replacement instead of false continuity

Typical structural sources:

- kind change with similar wording
- textually similar replacement without stable identity
- ambiguous heuristic fallback decline

Default severity:

- `s3-critical`

Impact axis:

- `ambiguity`

Must not absorb:

- deterministic rename
- deterministic move

### 8. `behavior-update`

Use when:

- structural continuity survives
- the change modifies behavior, triggers, or activation conditions
- the change is not best framed as move, reorder, or rename

Typical structural sources:

- transition guard changed with stable linkage
- state activation changed
- event declaration payload or guard changed

Default severity:

- `s2-review`

Primary impact axis:

- `flow`, `state`, or `event` depending on owner

### 9. `permission-update`

Use when:

- a permission-related extension hook changes under a stable owner
- reviewer attention should focus on access or visibility consequences rather than generic property noise

Typical structural sources:

- permission-conditioned visibility change
- gated transition change
- readonly/disabled/hidden state hook update

Default severity:

- `s2-review`

Impact axis:

- `permission`

Severity escalation:

- escalate to `s3-critical` when the permission change blocks or unlocks a major flow

### 10. `ambiguity-warning`

Use when:

- the structural layer explicitly declined continuity because bounded rules could not prove one
- the reviewer should know the engine chose conservative fallback on purpose

Typical structural sources:

- heuristic multi-candidate ambiguity
- forbidden-zone similarity candidate
- screen-split conservative fallback

Default severity:

- `s3-critical`

Impact axis:

- `ambiguity`

Rules:

- this category may accompany `entity-replaced`, but it must not hide the conservative structural outcome

## Mapping Rules

Translate structural outcomes in this order:

1. decide whether the structural event is continuity-preserving or conservative replacement
2. choose the summary category from the fixed list above
3. assign the default severity
4. elevate severity only when one of the documented escalation rules applies
5. assign exactly one primary impact axis

## Mapping Matrix

| Structural source | Summary category | Default severity | Primary axis |
| --- | --- | --- | --- |
| property-only label/text update | `presentation-update` | `s0-minor` | `presentation` |
| deterministic `reorder` | `structure-reorder` | `s1-notice` | `structure` |
| deterministic `move` | `structure-move` | `s2-review` | `structure` |
| deterministic rename-capable change | `identity-rename` | `s1-notice` | `behavior` |
| structural `add` | `entity-added` | `s1-notice` | owner-based |
| structural `remove` | `entity-removed` | `s2-review` | owner-based |
| structural `remove+add` | `entity-replaced` | `s3-critical` | `ambiguity` |
| bounded heuristic reorder/update continuity | same structural category | one level above deterministic default when reviewer trust is sensitive | `ambiguity` or owner-based |
| transition guard or activation update | `behavior-update` | `s2-review` | owner-based |
| permission hook update | `permission-update` | `s2-review` | `permission` |
| explicit conservative fallback notice | `ambiguity-warning` | `s3-critical` | `ambiguity` |

## Heuristic Guardrail

When a summary category is derived from heuristic continuity:

- do not change the base category purely because it was heuristic
- do mark the summary event as heuristic-derived in later payload work
- do allow severity to escalate by one level if reviewer trust would otherwise be overstated

Examples:

- heuristic same-parent reorder:
  - base category remains `structure-reorder`
  - default severity may rise from `s1-notice` to `s2-review`
- heuristic update on missing-ID same-kind entity:
  - base category remains `behavior-update` or `presentation-update` depending on the changed field
  - later payload should expose that continuity was heuristic

## Forbidden Mappings

The summary layer must not:

- convert `remove+add` into rename because wording looks similar
- hide a move as presentation-only change
- flatten permission-sensitive changes into generic property noise
- reinterpret raw DSL text outside structural diff evidence
- invent new categories ad hoc for one ticket

## Extension-Hook Guidance

Reserved extension hooks from `docs/current/diff/diff-ir-extension-points.md` should map into summary categories through their owning unit.

Use this rule:

- state hook change -> `behavior-update` or `permission-update`
- event hook change -> `behavior-update`
- transition hook change -> `behavior-update` or `entity-added` / `entity-removed`
- permission hook change -> `permission-update`

Do not invent detached summary categories such as "transition blob changed" or "permission blob changed".

## Acceptance Criteria

This vocabulary is complete enough when:

- every representative structural scenario can map to one summary category without category invention
- every summary event can carry one default severity and one primary impact axis
- heuristic and conservative fallback outcomes remain visible instead of hidden
- later payload/schema work can attach without redefining category semantics

## Change History

- 2026-03-28: Initial summary event vocabulary and severity model for Diff Engine Epic D / Sprint D1 / `T-20260328-160`.
