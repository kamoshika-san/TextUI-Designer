# Visual Diff Change-Kind UI Rules

## Purpose

This document defines the reviewer-facing UI rules for each supported Visual Diff change kind on top of:

- [ADR 0009](./adr/0009-visual-diff-rendering-contract.md)
- [Visual Diff Display Modes](./visual-diff-display-modes.md)

It fixes how each change kind should be emphasized, which cues are global, and which distinctions must remain visible under review pressure.

## Shared Invariants

All change kinds inherit the same contract semantics.

- Severity meaning comes from `visual-diff-presentation/v0` and must not be remapped per kind.
- Heuristic and ambiguity remain global signals, not kind-specific reinterpretations.
- Navigation availability remains governed by `visual-diff-navigation/v0`.
- Display modes may change density, but they must not change the kind-specific semantics defined here.

## Global Badge Rules

The following badge rules are global across all change kinds:

- `heuristic`
  - present whenever the item is heuristic-derived
  - must never be hidden because a kind already looks low-risk
- `ambiguous`
  - present whenever ambiguity is surfaced
  - must remain visible in all modes
- `fallback`
  - present whenever ambiguity is present or replacement interpretation was forced
  - must be treated as a caution signal rather than decorative metadata
- `review-required`
  - present whenever the upstream contract marks heuristic-derived review escalation
  - must not be added or removed by local kind-specific styling choices
- `replace`
  - used only for `remove+add`

Kind-specific UI may add emphasis around these badges, but it must not change their meaning.

## Global Reviewer Emphasis Rules

- `critical` and `warn` items must remain visually stronger than `notice` and `minor` regardless of change kind.
- `high` review-priority items must win ordering and truncation decisions before any kind-specific preference.
- A kind that is usually low-risk may still render as urgent when ambiguity, heuristic, or severity requires it.

## Per-Kind Rules

## `add`

## Reviewer meaning

A new entity exists only on the `after` side.

## UI rule

- Primary emphasis is arrival, not conflict.
- The `after` side is the only actionable navigation target.
- The card or row should make absence of the `before` side feel expected, not broken.

## Required distinctions

- Must look distinct from `update`.
- Must not reuse replacement-specific emphasis.
- If heuristic or ambiguity badges are present, they override the default "safe arrival" feel and promote caution.

## `remove`

## Reviewer meaning

An entity existed only on the `before` side and is gone from the `after` side.

## UI rule

- Primary emphasis is loss or disappearance.
- The `before` side is the only actionable navigation target.
- Missing `after` context must be presented as expected removal state, not as missing data.

## Required distinctions

- Must feel stronger than `add` when severity is equal because removal is usually more review-sensitive.
- Must not be visually confused with `move` or `rename`.

## `update`

## Reviewer meaning

The same paired entity changed in place.

## UI rule

- Primary emphasis is modification, not structural replacement.
- Both sides should be easy to compare in `Full` and `Split`.
- Compact mode should retain enough signal to show that the item is a delta, not a create/delete event.

## Required distinctions

- Must remain the baseline comparison pattern.
- Must not look like `rename` when the only meaningful difference is not identity-related.

## `reorder`

## Reviewer meaning

The same set of entities remains, but order changed.

## UI rule

- Primary emphasis is sequence movement, not content mutation.
- Visual treatment should highlight ordering context ahead of property detail.
- `Split` is the most explanatory mode for this kind and should preserve lane-to-lane comparability.

## Required distinctions

- Must not look like `move` when order changes stay inside one logical grouping.
- Must not look like `update` even if labels and badges are otherwise similar.

## `move`

## Reviewer meaning

The same entity moved to a different location in the structure.

## UI rule

- Primary emphasis is relocation.
- Before/after path contrast is more important than dense narrative text.
- `Split` should make path displacement obvious without turning the item into a replacement state.

## Required distinctions

- Must be distinguishable from `reorder` by stronger path/position contrast.
- Must be distinguishable from `rename` by emphasizing structural destination rather than identity label.

## `rename`

## Reviewer meaning

The same paired entity kept continuity but changed identity-facing naming.

## UI rule

- Primary emphasis is identity relabeling.
- Before/after comparison should foreground the renamed field rather than structural lane change.
- The item should read lighter than `remove+add` when the system still has deterministic continuity.

## Required distinctions

- Must not be styled as replacement.
- Must remain distinguishable from generic `update` by explicitly calling out identity/name change.

## `remove+add`

## Reviewer meaning

A replacement-oriented state was forced because stable continuity was not retained or not trusted.

## UI rule

- This kind must receive explicit replacement emphasis.
- `replace` and `fallback` are both mandatory signals.
- The item should feel more cautionary than `add` plus `remove` shown side by side.
- `Split` should preserve both disappearance and arrival context while still reading as one replacement-oriented decision.

## Required distinctions

- Must never be rendered as a plain pair of unrelated events.
- Must remain visually stronger than `rename` and `update`.
- When ambiguity is also present, the item must read as one of the highest-attention states in the UI.

## Fallback-Heavy and Ambiguous States

- Any change kind with `ambiguous` or `fallback` must receive caution emphasis even if its base kind is usually routine.
- `remove+add` is always fallback-aware and must not be visually softened.
- Ambiguity markers must remain visible in `Compact`, not only in `Full`.

## Heuristic States

- Heuristic provenance is always additive to the base kind.
- The base kind still explains what changed.
- The heuristic badge explains how confidently the system paired it.
- A heuristic `rename` or `move` must not be visually collapsed into a deterministic version of the same kind.

## Mode Interaction Rules

- `Compact`
  - keeps the strongest per-kind cue plus global badges
  - does not need full evidence detail, but must preserve replacement, ambiguity, and heuristic signals
- `Full`
  - keeps complete per-kind cues plus evidence context
  - is the baseline mode for validating these rules
- `Split`
  - prioritizes path and before/after context
  - must not weaken replacement, move, reorder, or rename distinctions

## Non-Goals

This document does not define:

- exact icon assets
- exact color token values
- CSS classes or component implementation
- performance degradation behavior
- rollout exposure strategy

Those decisions belong to later tickets and must implement, not reinterpret, these rules.

## Downstream Expectations

- `P2-T3` may constrain how many of these cues remain visible under load, but it must preserve the relative semantics.
- `P3-T1` should include at least one fixture per change kind and additional cases for heuristic and ambiguity overlays.
- `P3-T2` should treat these rules as snapshot interpretation policy for future renderer output.

## References

- [ADR 0009](./adr/0009-visual-diff-rendering-contract.md)
- [Visual Diff Display Modes](./visual-diff-display-modes.md)
- `src/core/textui-visual-diff-presentation.ts`
