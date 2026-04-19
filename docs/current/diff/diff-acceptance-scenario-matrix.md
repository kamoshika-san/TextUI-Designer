# Diff Acceptance Scenario Matrix

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-128`

## Background

Sprint A1 and A2 established the vocabulary and the main classification boundaries for identity, reorder, move, rename, and heuristic rescue. Sprint A3 now needs representative acceptance scenarios so later implementation and test work can validate the diff engine against the intended behavior rather than ad hoc examples.

This page defines the scenario matrix for the current Diff IR design. It is an acceptance-design artifact, not an executable test suite.

## Scope

This page covers:

- representative change scenarios the diff engine must classify
- boundary cases where reviewer trust depends on conservative behavior
- separation of normalization concerns from structural diff concerns

This page does not define:

- final automated tests
- final semantic summary text
- UI rendering of diff results

## How To Read This Matrix

Each scenario records:

- the change pattern
- the minimum preconditions
- the expected classification outcome
- the non-goal or disallowed interpretation

The matrix assumes normalized comparison inputs where applicable, but it does not delegate diff decisions back into normalization.

## Scenario Matrix

### 1. Sibling reorder inside same container

- Pattern: two or more sibling nodes swap order under the same parent and same slot
- Preconditions: node identity remains deterministic; parent identity and slot stay unchanged
- Expected outcome: `reorder`
- Non-goal: do not emit `move` or remove-plus-add

### 2. Cross-parent relocation with stable identity

- Pattern: the same logical node moves from one container subtree to another
- Preconditions: deterministic identity survives; parent scope changes
- Expected outcome: `move`
- Non-goal: do not collapse into plain reorder

### 3. Slot-to-slot relocation inside one higher-level container

- Pattern: a node moves from one named slot to another inside the same owning container
- Preconditions: deterministic identity survives; slot semantics are distinct
- Expected outcome: `move`
- Non-goal: do not classify as reorder just because the higher-level container is unchanged

### 4. Label-only change on stable component

- Pattern: visible button label, heading text, or helper text changes while the component identity remains stable
- Preconditions: deterministic identity survives; kind and ownership stay intact
- Expected outcome: property change
- Non-goal: do not emit remove-plus-add

### 5. Durable-handle rename on stable entity

- Pattern: a state name, event handle, or similar authored handle changes on an already-matched entity
- Preconditions: deterministic identity survives independently of the renamed field
- Expected outcome: rename-capable same-entity change
- Non-goal: do not use the rename as identity rescue

### 6. Textually similar replacement without stable identity

- Pattern: an old entity disappears and a new nearby entity appears with similar wording
- Preconditions: no deterministic identity survives
- Expected outcome: remove-plus-add
- Non-goal: do not claim rename or same-entity continuity based only on wording similarity

### 7. Kind change with similar wording

- Pattern: one component kind is replaced by another kind but some text or label remains similar
- Preconditions: kind changes across the old and new entities
- Expected outcome: remove-plus-add
- Non-goal: do not claim continuity from shared wording

### 8. Missing-ID same-parent heuristic rescue

- Pattern: a component loses its explicit ID during regeneration, but remains in the same screen, same parent scope, and same kind with highly similar property profile
- Preconditions: deterministic identity is unavailable; heuristic rescue stays inside allowed similarity zone
- Expected outcome: heuristic continuity may be applied
- Non-goal: do not let heuristic rescue override a stronger deterministic result

### 9. Missing-ID multi-candidate ambiguity

- Pattern: one old entity could plausibly match multiple new entities after regeneration
- Preconditions: more than one candidate remains after bounded filtering
- Expected outcome: remove-plus-add fallback
- Non-goal: do not silently pick a winner

### 10. Cross-screen similar wording

- Pattern: similar-looking entities appear across different screens
- Preconditions: candidate continuity would cross screen boundaries
- Expected outcome: remove-plus-add or independent add/remove events
- Non-goal: do not use cross-screen heuristic rescue

### 11. Transition added

- Pattern: a new transition appears between screens or states
- Preconditions: the old comparison side lacks that transition
- Expected outcome: transition addition
- Non-goal: do not reinterpret as property change on an unrelated transition

### 12. Transition removed

- Pattern: an existing transition disappears
- Preconditions: the new comparison side lacks that transition
- Expected outcome: transition removal
- Non-goal: do not hide the removal behind a generic screen update

### 13. Transition guard changed with stable linkage

- Pattern: source, destination, and trigger linkage stay stable while the guard condition changes
- Preconditions: transition identity remains deterministic
- Expected outcome: transition property change
- Non-goal: do not classify as transition removal plus re-addition unless deterministic linkage is actually broken

### 14. Screen split into multiple screens

- Pattern: one previous screen is refactored into two or more screens
- Preconditions: no approved deterministic model spans the old screen into multiple new screen identities
- Expected outcome: conservative remove-plus-add at screen level, with downstream review attention
- Non-goal: do not invent one-to-many continuity in Epic A

### 15. Permission-conditioned visibility change

- Pattern: a node, state, or transition becomes hidden, disabled, gated, or otherwise constrained by permission logic
- Preconditions: the same owning unit remains identifiable; permission hook or source rule changes
- Expected outcome: property or extension-point change on the owning unit, with permission-sensitive interpretation reserved for later semantic layers
- Non-goal: do not require a mandatory standalone permission top-level IR unit in Epic A

### 16. State activation change

- Pattern: a state remains the same state but its activation condition changes
- Preconditions: state identity remains deterministic
- Expected outcome: state property or activation-related change
- Non-goal: do not treat as state replacement unless identity actually breaks

### 17. Event declaration change with stable owner

- Pattern: an event changes payload or guard structure while remaining under the same owner
- Preconditions: event identity remains deterministic
- Expected outcome: event property change
- Non-goal: do not treat descriptive copy around the event as event identity

## Boundary Notes

- normalization must handle notation or default-value equivalence before these scenarios are evaluated as semantic diff cases
- these scenarios assume the diff layer receives IR with authored order, explicitness, and source references preserved
- where extension hooks are involved, the expected outcome is still anchored to the owning unit rather than to a detached global blob

## Coverage Summary

This matrix intentionally covers:

- reorder
- move
- label and text change
- rename
- remove-plus-add
- heuristic rescue
- split-style conservative fallback
- transition add/remove/update
- permission-conditioned change
- state and event extension-aware cases

## Verification

- Confirm every major ambiguity called out in Epic A appears in at least one scenario
- Confirm each scenario states both the intended classification and the disallowed shortcut
- Confirm normalization and diff responsibilities remain separate in the scenario wording

## Change History

- 2026-03-28: Initial acceptance scenario matrix for Diff Engine Epic A / Sprint A3 / `T-20260328-128`.
