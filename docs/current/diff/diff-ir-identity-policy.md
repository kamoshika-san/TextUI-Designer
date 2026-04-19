# Diff IR Identity Policy

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-123`

## Background

The Diff IR vocabulary defines the comparison units, and the extraction contract defines how DSL input becomes that IR. The remaining Sprint A1 requirement is a baseline policy for how those units establish identity.

This page fixes the identity-key priority for the minimal Diff IR units so later structural diff work can distinguish rename, move, and remove-plus-add without inventing identity rules on the fly.

## Scope

This page covers:

- primary identity keys for screens, structural nodes, states, events, and transitions
- fallback identity rules when explicit stable IDs are absent
- fields that may support review context but must not define identity
- constraints required by later move and rename analysis

This page does not define:

- similarity scoring between unrelated nodes
- final move or rename event emission rules
- normalization of aliases or defaults
- reviewer-facing severity or summary text

## Core Principles

### 1. Identity must be more stable than display text

Identity exists to answer "is this the same logical thing" across edits. Therefore the policy must prefer authored identifiers, ownership paths, and structural anchors over labels or visible text.

### 2. Identity and presentation must stay separate

Display text, labels, and captions are reviewable properties. They are not identity by themselves. A label change should remain eligible to appear as an update, not automatically collapse into remove-plus-add.

### 3. Fallback keys are deterministic, not heuristic

When explicit stable IDs are absent, the fallback must be mechanically derivable from extracted IR fields. Similarity-based rescue belongs to later tickets such as `T-20260328-126`, not this baseline.

### 4. Identity is always scoped

Identity keys are evaluated inside a defined owner scope. A `nodeKey` or `stateKey` is not globally unique unless the policy explicitly says so.

## Identity-Key Priority by IR Unit

### 1. Screen

Primary identity priority:

1. explicit screen-level stable ID from the DSL when available
2. canonical route or navigation key when the DSL treats it as the stable screen handle
3. extraction-time source ownership path that consistently identifies the screen declaration

Fallback rules:

- screen name may assist reviewer context but must not be the primary or sole identity key
- if both route and name change without a stable ID, the baseline policy treats the screen as remove-plus-add until later tickets define broader matching

Required output:

- `screenKey` must record the winning identity candidate
- extraction or normalization metadata may also retain `identityBasis` for auditability

### 2. Structural UI node

Primary identity priority:

1. explicit node ID or authored key intended to survive edits
2. explicit slot name or semantic placement key when the DSL defines the node by owned position
3. scoped structural ownership path composed from ancestor identity plus local kind/slot anchor

Fallback rules:

- `kind` is required context but is not sufficient as a standalone identity
- labels, button text, placeholders, and other display-facing properties must not be used as the primary fallback
- sibling ordinal may be retained as supporting metadata for move or reorder analysis, but ordinal alone must not become the node identity

Interpretation notes:

- if a node keeps the same stable ID and changes label text, treat it as the same node with property changes
- if a node loses all stable anchors and reappears elsewhere with only similar visible text, this baseline does not force a match

### 3. State variant

Primary identity priority:

1. explicit state ID or state key from the DSL
2. owner-scoped state name when the DSL models state names as stable handles
3. owner-scoped activation key or condition handle when that trigger is the durable authored anchor

Fallback rules:

- visible state labels must not define identity
- state order may be preserved for later analysis but must not be the sole identity basis

Interpretation notes:

- state identity is scoped under the owning screen or node
- a renamed state without a stable ID is not automatically preserved as "same state" by this baseline

### 4. Event

Primary identity priority:

1. explicit event ID or authored event key
2. owner-scoped event handle combining canonical event type with a stable authored trigger key
3. owner-scoped source ownership path when the DSL does not expose a durable event key

Fallback rules:

- event display copy or UI text around the trigger must not define identity
- generic event type alone, such as `click`, is not sufficient identity

### 5. Transition

Primary identity priority:

1. explicit transition ID from the DSL
2. tuple of `fromScreenKey`, `triggerEventKey`, and `toScreenKey`
3. tuple of `fromScreenKey`, destination anchor, and guard anchor when trigger event is absent but navigation linkage is still explicit

Fallback rules:

- transition order is not identity
- destination label text is not identity; destination screen key is

Interpretation notes:

- if source and destination remain stable while guard logic changes, the transition remains the same transition with updated properties
- if destination changes, the baseline policy treats that as a different transition unless later semantics choose to summarize it differently

## Non-Identity Fields

The following fields may support review context, summary text, or similarity matching later, but must not be used as the baseline identity key:

- screen name
- button label
- text node content
- placeholder text
- helper text
- display-only badge or caption text
- sibling ordinal by itself
- formatting-only property groups

These fields are intentionally left available for future heuristic matching, but they are not authoritative identity in Sprint A1.

## Ownership and Scope Rules

- `screenKey` is unique within one extracted IR root
- `nodeKey` is unique within its parent or slot scope
- `stateKey` is unique within its owner scope
- `eventKey` is unique within its owner scope
- `transitionKey` is unique within the source-screen scope unless an explicit global ID exists

When a fallback key uses an ownership path, that path must be built from already-established parent identity candidates rather than raw display strings.

## Interaction with Later Tickets

- `T-20260328-124` may decide when ordinal change is reorder versus move, but it must not replace this identity priority
- `T-20260328-125` may define how rename is reported after identity is established
- `T-20260328-126` may add heuristic matching for missing IDs, but only as a layer after this deterministic baseline
- normalization tickets in Epic B may canonicalize field names, but they must preserve whichever fields this policy depends on

## Verification

- Confirm every IR unit in `docs/current/diff/diff-ir-vocabulary.md` has either a primary stable ID path or a deterministic fallback path
- Confirm label or display text changes can remain property updates when a stronger identity anchor exists
- Confirm sibling order is preserved as metadata without becoming the sole identity for a node
- Confirm move, rename, and remove-plus-add remain separable questions for Sprint A2 instead of being collapsed here

## Change History

- 2026-03-28: Initial identity-key baseline for Diff Engine Epic A / Sprint A1 / `T-20260328-123`.
