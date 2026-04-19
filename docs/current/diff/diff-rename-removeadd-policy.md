# Diff Rename And Remove-Add Policy

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-125`

## Background

The identity baseline already states that labels and visible text are not authoritative identity by themselves. The remaining ambiguity is how later diff logic should interpret text-bearing edits once identity has been established.

This page defines the boundary between:

- property-only text or label updates
- rename-like same-entity changes
- remove-plus-add fallback when continuity would be misleading

The goal is to keep review output stable when wording changes, while avoiding false continuity when an element was actually replaced.

## Scope

This page covers:

- label, title, and text updates on already-matched entities
- rename-capable versus rename-incapable cases
- deterministic fallback to remove-plus-add
- reviewer-facing interpretation notes for later semantic diff work

This page does not define:

- heuristic similarity matching for missing IDs
- move detection
- severity labels
- final reviewer summary wording

## Core Principles

### 1. Visible text is usually a property, not identity

If an entity is already matched through stable identity, changes to label, title, caption, helper text, or body text should normally remain property-level updates.

### 2. Rename is narrower than generic text change

Rename should be reserved for cases where the changed field acts as a durable authored handle inside an already-matched entity, not merely user-facing copy.

### 3. False continuity is worse than conservative replacement

If continuity depends on treating display text as identity after stronger anchors are lost, the engine should prefer remove-plus-add over speculative rename.

## Decision Rules

### 1. Property change

Classify as property change when all of the following hold:

- the entity already matches through deterministic identity rules
- the changed field is display-facing or descriptive
- ownership scope and kind continuity remain intact

Typical examples:

- button label changes from `Save draft` to `Save`
- section title changes from `Search Filters` to `Filter`
- helper text is rewritten under the same input component
- text node copy is updated while the same explicit node ID remains

Interpretation notes:

- these cases should not be elevated to remove-plus-add
- these cases do not need a separate rename classification unless the field is also the durable authored handle

### 2. Rename-capable same-entity change

Classify as rename-capable only when all of the following hold:

- the entity already matches through deterministic identity
- the changed field is used as an authored handle or durable semantic name inside that entity's scope
- the entity kind and ownership continuity remain intact

Rename-capable examples:

- a state name changes while the state still matches by explicit state ID
- an internal event handle changes while event identity still comes from an explicit event ID
- a named slot alias or semantic role label changes on an already-matched container definition

Interpretation notes:

- rename is a refinement on top of same-entity continuity, not a rescue mechanism
- rename should only appear where the field meaningfully names the entity rather than merely describing it to end users

### 3. Remove-plus-add fallback

Classify as remove-plus-add instead of rename or property change when any of the following hold:

- no deterministic identity match survives
- the only continuity signal is similar display text
- entity kind changes in a way that breaks same-entity continuity
- ownership scope changes so strongly that the old and new entity cannot be trusted as the same logical unit
- the old entity disappears and a new entity appears with revised text but no stronger anchor

Typical examples:

- a button without stable identity disappears and a similarly labeled link appears nearby
- a section heading changes and the surrounding subtree is rebuilt without matching node anchors
- an input field is replaced by a select control with similar display text

## Field Guidance

### 1. Usually property-only fields

The following fields should default to property change on an already-matched entity:

- button label
- visible text content
- placeholder
- helper text
- badge text
- section title shown to end users
- caption or description copy

### 2. Potentially rename-capable fields

These fields may justify rename classification, but only when identity is already independently established:

- state name
- event handle
- transition alias
- semantic slot alias
- authored role name intended for later references

### 3. Not valid rescue fields

The following must not rescue continuity on their own:

- similar label text
- similar placeholder text
- nearby descriptive copy
- translated or rephrased UI wording

## Reviewer-Oriented Interpretation

- "same entity, different wording" should usually appear as property change
- "same entity, renamed durable handle" may appear as rename if identity is otherwise secure
- "old thing removed, new thing added with similar copy" must remain remove-plus-add

This distinction matters because AI-generated DSL often rewrites text aggressively. The diff engine must suppress wording noise without inventing continuity that is not backed by stronger anchors.

## Interaction With Other Rules

- `docs/current/diff/diff-ir-identity-policy.md` remains the authority for baseline continuity
- `docs/current/diff/diff-reorder-move-policy.md` handles structural relocation and should not be reinterpreted here
- `T-20260328-126` may later add heuristic matching boundaries, but this policy must remain correct without heuristic rescue

## Verification

- Confirm display-text-only edits can remain property changes when stronger identity exists
- Confirm rename classification is limited to durable handles on already-matched entities
- Confirm similar wording alone cannot turn remove-plus-add into rename
- Confirm kind changes with similar text still fall back to remove-plus-add

## Change History

- 2026-03-28: Initial rename versus remove-plus-add baseline for Diff Engine Epic A / Sprint A2 / `T-20260328-125`.
