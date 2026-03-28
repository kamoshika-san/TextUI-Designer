# Diff Similarity Matching Boundary

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-126`

## Background

Sprint A1 and A2 already fixed the deterministic baseline for identity, reorder versus move, and rename versus remove-plus-add. The remaining gap is how the diff engine may behave when explicit stable IDs are missing and deterministic continuity is too weak.

This page defines a constrained similarity-matching layer. Its purpose is not to replace deterministic identity, but to document when heuristic rescue is allowed, when it is forbidden, and when the safer result remains remove-plus-add.

## Scope

This page covers:

- permitted use of similarity matching for missing-ID elements
- prohibited rescue patterns
- precedence between deterministic rules and heuristic rescue
- reviewer-trust safeguards and fallback behavior

This page does not define:

- model-specific AI heuristics
- final scoring implementation
- move, rename, or severity wording
- runtime threshold tuning

## Core Principles

### 1. Deterministic identity always wins

Similarity matching is a fallback layer only. If deterministic identity, reorder, move, or rename rules already produce a stable answer, heuristic rescue must not override it.

### 2. Similarity may rescue continuity only inside bounded scope

Heuristic matching is only acceptable when the candidate old and new entities remain close in structural scope and kind, and when the rescue increases reviewer usefulness without creating hidden ambiguity.

### 3. Reviewer trust is more important than aggressive matching

When similarity is ambiguous, the engine should prefer remove-plus-add instead of claiming continuity. A false match damages review trust more than a conservative unmatched result.

## Matching Precedence

Apply continuity logic in this order:

1. deterministic identity from `docs/diff-ir-identity-policy.md`
2. deterministic reorder or move rules from `docs/diff-reorder-move-policy.md`
3. deterministic rename or property-change rules from `docs/diff-rename-removeadd-policy.md`
4. bounded similarity rescue from this document
5. remove-plus-add fallback

Similarity matching must not run first and must not rewrite a stronger earlier result.

## Allowed Similarity Zones

Similarity rescue may be considered only when all of the following hold:

- no explicit stable ID or deterministic fallback key is available
- the old and new entities share the same canonical kind
- the comparison remains within the same screen scope
- the parent scope is identical or closely bounded enough that relocation is not being guessed
- no stronger deterministic rule already classified the change

Examples of allowed zones:

- same-parent sibling set where one component lost its authored key during AI regeneration
- same screen, same container, same kind, and highly similar property profile
- state, event, or transition records with missing IDs but otherwise tightly bounded owner scope and matching structural anchors

## Forbidden Similarity Zones

Similarity rescue must be forbidden when any of the following hold:

- candidate continuity crosses screen boundaries
- candidate continuity crosses parent scope in a way that could be mistaken for move
- entity kind changes
- only display text is similar while structural anchors diverge
- multiple candidate matches remain plausible after bounded filtering
- the match would contradict a deterministic move, rename, or remove-plus-add conclusion

Examples of forbidden zones:

- similar button copy in two different screen regions
- a text input replaced by a select with similar label wording
- a node recreated in another subtree where only visible text still resembles the original

## Allowed Similarity Signals

When similarity rescue is allowed, the engine may draw from signals such as:

- same canonical kind
- same owner scope or tightly bounded parent scope
- similar canonical property shape, excluding volatile display text as the sole basis
- similar slot placement when slot semantics remain unchanged
- similar event or transition anchors when owner scope is stable

These signals are supportive only. No single signal should force a match in isolation.

## Prohibited Rescue Signals

The following signals must not rescue continuity on their own:

- similar label text
- similar placeholder text
- translated or paraphrased UI wording
- sibling ordinal alone
- loose visual resemblance inferred from semantics not present in IR

This rule preserves the separation between wording noise suppression and actual identity continuity.

## Ambiguity Handling

If heuristic matching produces more than one plausible candidate, the engine should:

- decline the heuristic rescue
- fall back to remove-plus-add
- preserve enough trace metadata so reviewer tooling can explain that continuity was intentionally not claimed

The engine should not silently pick one candidate unless later implementation work introduces an explicitly approved tie-break policy.

## Reviewer-Trust Safeguards

- heuristic rescue must be auditable as heuristic, not deterministic
- fallback to remove-plus-add is the default when confidence is not clearly bounded
- later reviewer UI may expose that a match was heuristic, but this ticket only defines the boundary, not the UI

This is especially important for AI-generated DSL where regenerated structures often look superficially similar across multiple nearby nodes.

## Interaction With Later Work

- Epic H may collect AI-noise examples and propose richer heuristic signals, but those signals must still obey the forbidden zones in this document
- Epic C may implement internal matching passes, but deterministic results must remain authoritative
- reviewer-facing or semantic-diff wording may later distinguish heuristic continuity, but that is outside the current scope

## Verification

- Confirm heuristic matching cannot override deterministic identity, reorder, move, or rename outcomes
- Confirm cross-screen and cross-parent guesswork remain forbidden
- Confirm similar wording alone cannot rescue continuity
- Confirm ambiguous multi-candidate cases fall back to remove-plus-add

## Change History

- 2026-03-28: Initial similarity-matching boundary for Diff Engine Epic A / Sprint A2 / `T-20260328-126`.
