# Visual Diff Display Modes

## Purpose

This document defines the deterministic display-mode behavior for Visual Diff on top of [ADR 0009](./adr/0009-visual-diff-rendering-contract.md).

It answers one question only: given the fixed Visual Diff rendering contract, how must `Compact`, `Full`, and `Split` present the same input without inventing new semantics?

## Shared Inputs

All modes consume the same contract stack:

- `visual-diff-view-model/v0`
- `visual-diff-presentation/v0`
- `visual-diff-navigation/v0`

Modes may differ in density, grouping, and evidence reveal, but they must not reinterpret:

- severity mapping
- ambiguity / heuristic semantics
- `remove+add` replacement semantics
- navigation availability or missing-state semantics

## Shared Ordering Rules

Unless a mode explicitly says otherwise, items are ordered by the following stable priority:

1. `reviewPriority`: `high` before `medium` before `low`
2. severity tone: `critical` before `warn` before `notice` before `minor`
3. original item order from `visual-diff-view-model/v0`

This order is the shared base for truncation, grouping, and fixture expectations.

## Compact Mode

## Goal

Compact mode is the fastest reviewer scan. It surfaces the most actionable items first and intentionally hides lower-signal detail.

## Required behavior

- Compact mode shows only the top `N` items from the shared ordering rules.
- Default `N` is `5`.
- Ties at the cutoff are resolved by the shared ordering rules only. Compact mode must not grow beyond `N` to preserve stable snapshot expectations.
- Compact mode must preserve item-level severity, badges, and display label exactly as defined by `visual-diff-presentation/v0`.
- Compact mode must show at most one navigation action per item:
  - use `primarySide` from `visual-diff-navigation/v0`
  - if `primarySide` is `both`, prefer `before` as the visible inline action and keep `after` behind secondary detail affordance
  - if `primarySide` is `none`, show fallback copy and no jump action

## Evidence policy

- Compact mode shows only summary evidence:
  - label
  - severity tone
  - badges
  - primary navigation affordance or fallback copy
- Compact mode must not expand full evidence refs, narrative group text, or both-side navigation details inline.
- If items are truncated, the UI must show an omitted-count summary such as "X more changes in Full mode" without summarizing hidden semantics.

## Intended use

- PR-style quick scan
- reviewer landing state
- large result sets before switching to deeper inspection

## Full Mode

## Goal

Full mode is the complete inspection view. It shows all items and enough evidence context for a reviewer to understand why each item exists.

## Required behavior

- Full mode shows all items; no truncation is allowed.
- Full mode groups items by narrative/evidence context when available:
  - primary grouping key: narrative group / impact axis
  - fallback grouping key: ungrouped changes
- Within each group, items keep the shared ordering rules.
- Full mode must show both available navigation sides when `primarySide` is `both`.
- Full mode must show muted unavailable sides using the navigation-layer fallback copy instead of hiding the missing state entirely.

## Evidence policy

- Full mode expands the detail surface to include:
  - display label
  - severity tone
  - badges
  - both-side navigation state
  - evidence references tied to `eventId`
  - narrative context when present
- Full mode may reveal `summaryKey`, `ruleTrace`-derived label context, and narrative grouping text, but it must not invent new evidence fields beyond the fixed contracts.

## Intended use

- complete reviewer inspection
- fixture and snapshot baseline mode
- support surface for explaining ambiguity, heuristic provenance, and fallback behavior

## Split Mode

## Goal

Split mode is the comparative reading view. It emphasizes before/after context while preserving the same semantic prioritization as the other modes.

## Required behavior

- Split mode shows the same item set as Full mode. It is not a truncated mode.
- The distinctive behavior is layout, not semantics:
  - `before` context occupies the left or first comparison lane
  - `after` context occupies the right or second comparison lane
- For change kinds with only one applicable side:
  - `add`: only the `after` lane is actionable; the `before` lane shows the contract fallback state
  - `remove`: only the `before` lane is actionable; the `after` lane shows the contract fallback state
- For `primarySide = both`, both lanes must remain visible simultaneously.
- For `primarySide = none`, both lanes remain present as muted unavailable states so the user can understand that the issue is missing source/path data rather than hidden content.

## Evidence policy

- Split mode must prioritize path and source navigation clarity over long narrative text.
- Split mode shows:
  - display label
  - severity tone
  - badges
  - before/after path or fallback copy
  - both-side availability state
- Split mode may collapse long narrative explanation behind secondary disclosure, but it must not remove ambiguity or heuristic markers.

## Intended use

- side-by-side path inspection
- rename / move / reorder reading
- replacement-oriented investigation for `remove+add`

## Mode Selection Guidance

- Use `Compact` as the default entry mode when the user needs a quick review surface.
- Use `Full` when the user asks for all changes or when snapshot / fixture fidelity matters.
- Use `Split` when path-to-path comparison is the main task, especially for move, rename, reorder, and replacement-oriented inspection.

Mode choice affects density only. It must never change the underlying change classification or review semantics.

## Non-Goals

This document does not define:

- final CSS or token values
- exact component tree or WebView layout implementation
- virtualization strategy or large-result degradation behavior
- rollout or gate policy

Those concerns belong to later V0 tickets.

## Downstream Expectations

- `P2-T2` may refine change-kind-specific UI rules, but it must stay within these mode boundaries.
- `P2-T3` may define degradation behavior, but it must preserve the shared ordering and the semantic role of each mode.
- `P3-T1` and `P3-T2` should treat `Full` as the baseline fixture/snapshot mode and use `Compact` / `Split` as targeted variants where mode semantics matter.

## References

- [ADR 0009](./adr/0009-visual-diff-rendering-contract.md)
- `src/core/textui-visual-diff-view-model.ts`
- `src/core/textui-visual-diff-presentation.ts`
- `src/core/textui-visual-diff-navigation.ts`
