# Diff IR Vocabulary

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-121`

## Background

TextUI Designer needs a diff engine that compares UI intent rather than raw DSL text. The first prerequisite is a canonical vocabulary for the intermediate representation, or IR, that the future normalization and diff layers will consume.

This page defines the comparison units for the IR. It does not yet define normalization rules, matching heuristics, or semantic-diff wording.

## Scope

This page fixes the vocabulary for:

- the IR root
- screens
- structural UI nodes
- properties
- state variants
- events
- transitions

This page also identifies what is intentionally out of scope for the first IR vocabulary pass.

## Requirements

### 1. IR root

The IR root is the comparison payload for one DSL document pair.

Required responsibilities:

- hold the canonical list of screens
- hold document-level metadata needed for diff context
- preserve source references needed for reviewer jump-back

The IR root is not responsible for:

- normalization of equivalent expressions
- semantic severity classification
- visual diff payloads

### 2. Screen

A screen is the top-level review unit because product and design review usually start from "which screen changed".

Required fields:

- `screenKey`: stable identity candidate for the screen
- `name`: human-readable screen label as display metadata, not the sole identity
- `route`: navigation or path metadata when available
- `rootNode`: top structural node for the screen body
- `states`: state variants owned by the screen
- `transitions`: outgoing transitions owned by the screen
- `sourceRef`: DSL source reference

### 3. Structural UI node

A structural UI node is the canonical comparison unit for layout and component changes.

Node families:

- `container`: layout-bearing nodes such as pages, sections, groups, stacks, tables, tab containers, accordions, trees
- `component`: renderable leaf or near-leaf UI elements such as text, button, input, badge, image
- `slot`: named child positions or zones used to preserve semantic child placement

Required fields:

- `nodeKey`: identity candidate inside the parent scope
- `kind`: canonical component or layout kind
- `role`: optional semantic role metadata when distinct from kind
- `properties`: normalized property bag entry list
- `children`: ordered child node list
- `sourceRef`: DSL source reference

Notes:

- `children` remains ordered in the IR so later layers can reason about reorder and move instead of losing that information up front.
- Visual styling text is represented only through explicit properties, not as raw DSL snippets.

### 4. Property entry

A property entry is the smallest value-level comparison unit.

Required fields:

- `propertyKey`: canonical property name
- `valueKind`: scalar, enum, reference, expression-like, collection, object
- `value`: IR-safe value payload
- `sourceRef`: DSL source reference

Rules:

- Property entries represent explicit product-facing values.
- Formatting-only distinctions are not separate properties.
- Derived defaults are not expanded here; that belongs to normalization.

### 5. State variant

A state variant captures alternate UI behavior or presentation under the same screen or node.

Required fields:

- `stateKey`: identity candidate for the variant
- `ownerKey`: owning screen or node key
- `activation`: trigger or condition metadata
- `nodeOverrides`: structural or property overrides relative to the base node tree
- `sourceRef`: DSL source reference

### 6. Event

An event describes a user or system action that can trigger change inside the UI model.

Required fields:

- `eventKey`: identity candidate
- `ownerKey`: owning screen, node, or state
- `eventType`: click, submit, input, lifecycle, custom, and similar canonical categories
- `payloadShape`: optional payload contract metadata
- `sourceRef`: DSL source reference

### 7. Transition

A transition is the canonical comparison unit for navigation and flow review.

Required fields:

- `transitionKey`: identity candidate
- `fromScreenKey`: source screen key
- `toScreenKey`: destination screen key
- `triggerEventKey`: triggering event key when present
- `guardRef`: guard or condition reference when present
- `sourceRef`: DSL source reference

### 8. Source reference

Every reviewable IR unit should preserve a source reference.

Minimum source reference payload:

- document path
- line/column or equivalent range
- owning DSL object path when available

This keeps later Diff UI and jump-to-source support possible without redesigning the IR.

## Non-Functional Notes

- The vocabulary must be stable enough for PM, Developer, Reviewer, and future AI workflows to refer to the same comparison units without reinterpretation.
- The IR should prefer explicit, named fields over opaque serialized blobs.
- The vocabulary should remain implementation-neutral so both CLI and extension-host paths can emit the same comparison shape later.

## Constraints

- This page does not define the final identity-key priority. That belongs to `T-20260328-123`.
- This page does not decide when reorder becomes a semantic diff. That belongs to `T-20260328-124`.
- This page does not define similarity matching for missing IDs. That belongs to `T-20260328-126`.
- This page reserves extension space for permission rules but does not yet make permission a first-class required unit in the minimal vocabulary.

Out of scope in this pass:

- normalization of aliases, defaults, or ordering
- diff-event names such as `component.moved`
- reviewer-facing human summary sentences
- screenshot or visual diff payloads
- merge or three-way conflict payloads

## Verification

- Confirm each planned Epic A ticket can reference at least one IR unit defined on this page without inventing new top-level terminology.
- Confirm the vocabulary distinguishes screen, structural node, property, state, event, and transition as separate comparison units.
- Confirm reorder-sensitive child structure is preserved in the IR instead of flattened away.

## Change History

- 2026-03-28: Initial canonical vocabulary for Diff Engine Epic A / Sprint A1 / `T-20260328-121`.
