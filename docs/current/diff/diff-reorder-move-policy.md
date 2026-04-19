# Diff Reorder And Move Policy

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-124`

## Background

The Diff IR preserves authored child order so later layers can distinguish structure-preserving reordering from real relocation. After the identity baseline is fixed, the next requirement is a deterministic rule set for when a change stays `reorder` and when it should be elevated to `move`.

This page defines that boundary for structural UI nodes. It is intentionally narrower than final diff-event naming or reviewer-facing summary text.

## Scope

This page covers:

- sibling reorder versus move
- same-parent versus cross-parent relocation
- when add/remove fallback remains the safer result
- the minimum metadata later diff code must preserve to evaluate those cases

This page does not define:

- heuristic matching for missing IDs
- rename detection
- semantic severity labels
- final event payload schemas

## Core Principles

### 1. Reorder means identity is stable and ownership is unchanged

A change should remain `reorder` only when the same logical node stays under the same parent or slot scope and only its relative ordinal changes.

### 2. Move means identity is stable but structural ownership changes

A change should be elevated to `move` when the same logical node can still be identified, but its parent scope, slot, or ownership path changes in a way that is more than sibling re-sequencing.

### 3. Add/remove fallback is safer than false continuity

If identity cannot be established with the deterministic rules already fixed in `docs/current/diff/diff-ir-identity-policy.md`, the engine must fall back to remove-plus-add rather than emit a speculative move.

## Decision Rules

### 1. Reorder

Classify as `reorder` when all of the following hold:

- the node resolves to the same identity key before and after
- the immediate parent identity is unchanged
- the slot or named child placement is unchanged
- the node remains within the same sibling collection
- the only structural difference is relative position among siblings

Typical examples:

- a button moves from position 2 to position 4 inside the same action row
- two form fields swap order inside the same field group
- a tab definition stays in the same tab container but changes display order

Interpretation notes:

- reorder is still meaningful change metadata, but it is not the same as relocation
- reorder may coexist with property updates on the same node

### 2. Move

Classify as `move` when all of the following hold:

- the node resolves to the same identity key before and after
- the node no longer belongs to the same parent scope, slot, or ownership path
- the change is stronger than pure ordinal change

Move includes:

- cross-parent relocation between containers
- transfer between named slots within the same higher-level component
- extraction from one subtree and reinsertion into another subtree when identity remains stable

Typical examples:

- a search input moves from a header toolbar into a sidebar filter panel
- a button moves from `footer.actions.primary` to `header.actions.secondary`
- a card component moves from one section container to another while keeping the same stable node ID

Interpretation notes:

- move is permitted even when the screen stays the same
- cross-screen relocation is usually better represented as remove-plus-add unless the DSL has an explicit stable identity that intentionally spans screens

### 3. Add/remove fallback

Classify as remove-plus-add instead of `move` when any of the following hold:

- no deterministic identity match exists
- the candidate continuity depends on similarity heuristics not yet approved for the current layer
- parent and child anchors both changed so thoroughly that the old and new ownership paths cannot be linked confidently
- the node kind changed in a way that breaks same-entity continuity under the current identity policy

This fallback is mandatory for Sprint A2 because false move detection creates more review noise than conservative add/remove output.

## Parent Scope Rules

The minimum ownership anchors for reorder-vs-move evaluation are:

- `nodeKey`
- parent `nodeKey` or `screenKey`
- slot name when a slot is part of placement semantics
- sibling ordinal as supporting metadata only

Evaluation rules:

- same parent key plus same slot plus changed ordinal -> candidate `reorder`
- changed parent key with stable node identity -> candidate `move`
- same parent key but changed slot name -> candidate `move` when slot semantics are distinct
- same parent key with child collection rewritten but identity missing -> remove-plus-add fallback

## Container-Level Guidance

### 1. Same container, same slot

When a node stays inside the same ordered child list, treat it as `reorder` unless another rule upgrades it.

Examples:

- list item order changes inside the same list container
- form sections are re-sequenced inside the same page column

### 2. Same container, different slot

If the container exposes named semantic slots, moving between those slots is `move`, not `reorder`.

Examples:

- a component moves from `leftSidebar` to `mainContent`
- an action moves from `secondaryActions` to `primaryActions`

### 3. Different container

When the parent container identity changes, classify as `move` only if node identity remains deterministic. Otherwise emit remove-plus-add.

Examples:

- a filter block moves from a modal body into an inline page section with the same explicit node ID -> `move`
- a similar-looking filter block is recreated in another section without a stable ID -> remove-plus-add

## Interaction With Other Rules

- `docs/current/diff/diff-ir-identity-policy.md` remains the authority for whether two nodes are the same logical node
- `T-20260328-125` will define rename versus remove-plus-add boundaries for text and label changes
- `T-20260328-126` may later allow heuristic rescue for missing IDs, but this policy must remain valid without that rescue layer

## Verification

- Confirm sibling-only order changes can be classified without inventing new identity rules
- Confirm cross-parent relocation is explicitly separated from reorder
- Confirm named slot changes are not hidden as reorder
- Confirm missing deterministic identity forces remove-plus-add fallback instead of speculative move

## Change History

- 2026-03-28: Initial reorder versus move baseline for Diff Engine Epic A / Sprint A2 / `T-20260328-124`.
