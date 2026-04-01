# Visual Diff Performance Budget and Degrade UX

## Purpose

This document defines how Visual Diff should behave when result size exceeds the intended interaction budget.

It builds on:

- [ADR 0009](./adr/0009-visual-diff-rendering-contract.md)
- [Visual Diff Display Modes](./visual-diff-display-modes.md)
- [Visual Diff Change-Kind UI Rules](./visual-diff-change-kind-rules.md)

The goal is not to optimize implementation prematurely. The goal is to ensure that large-result behavior is deterministic, review-safe, and explicit before renderer work starts.

## Core Policy

When Visual Diff exceeds its intended rendering budget, the UI must degrade by reducing density first, not by changing semantics.

That means:

- do not reinterpret severity
- do not hide ambiguity, heuristic, or replacement signals silently
- do not switch change classification because the result is large
- do not drop reviewer-critical items before lower-signal items

## Budget Levels

These budgets define the expected default behavior before deeper optimization work begins.

### Level A: In-budget

- Up to `50` total items
- All modes behave normally
- No forced collapse required

### Level B: Review-heavy but manageable

- `51` to `150` total items
- Compact remains top-`5`
- Full and Split remain available
- Secondary evidence should default to collapsed
- Narrative group text may start collapsed by default

### Level C: Over-budget

- `151` to `400` total items
- Compact remains the default entry mode
- Full remains available, but non-critical detail must be progressively collapsed
- Split should open on demand rather than as the initial mode
- Staged rendering or viewport-first rendering is expected

### Level D: Extreme result

- More than `400` total items
- Compact is the only guaranteed initial mode
- Full and Split may require explicit user action to load additional detail
- Group-level summarization and deferred expansion are mandatory
- The UI must show an explicit over-budget notice

These thresholds are preparatory policy numbers, not performance test pass/fail metrics. Later implementation work may refine them only by updating this policy or its successor.

## Detail Reduction Order

When the UI must degrade, it must reduce detail in this order.

1. Collapse secondary narrative text
2. Collapse non-primary navigation detail for items where one side is already sufficient
3. Collapse group bodies behind group summaries
4. Defer low-priority item rendering behind explicit expand actions
5. Defer non-default modes until requested

The UI must not reduce detail in the reverse order. In particular, it must not hide high-priority items, ambiguity badges, heuristic badges, or replacement cues before collapsing supporting narrative detail.

## Always-Preserved Signals

The following cues must remain visible even under degraded conditions:

- severity tone
- `heuristic`
- `ambiguous`
- `fallback`
- `replace`
- `review-required`
- display label
- over-budget / omitted-detail messaging

If an item is shown at all, these signals must survive. Large-result mode is not allowed to flatten them into generic rows.

## Mode-Specific Degrade Rules

## Compact

- Compact already operates as the first reduction layer.
- Its top-`5` rule does not change under load.
- Over-budget behavior should add:
  - omitted-count messaging
  - group-level summary counts when available
  - a direct affordance to open Full mode for more detail

Compact must remain fast and stable. It should never expand to compensate for hidden detail elsewhere.

## Full

- Full is the semantic baseline mode, but it may collapse presentation detail under load.
- Under Level B and above:
  - narrative text defaults to collapsed
  - evidence detail defaults to collapsed
- Under Level C and above:
  - low-priority groups may render as summary rows first
  - groups load progressively
- Under Level D:
  - Full may load only the highest-priority groups initially
  - additional groups must require explicit user expansion

Even when collapsed, Full must make omitted detail obvious and recoverable.

## Split

- Split is the most expensive mode because it preserves both-side comparison.
- Under Level B:
  - Split remains available, but secondary narrative detail should start collapsed
- Under Level C:
  - Split should not be the default landing mode
  - expensive groups may require explicit user entry
- Under Level D:
  - Split may open only for a selected item or selected group rather than the entire result set

Split must never degrade into a misleading single-column view. If both-side context cannot be shown yet, the UI must say that the split detail is deferred.

## Collapse and Omission Rules

When content is collapsed or deferred:

- the UI must show what was omitted
- the UI must show why it was omitted
- the UI must show how to recover it

Minimum messaging requirements:

- omitted item count
- whether the omission is due to result size or mode choice
- the next action the user can take, such as:
  - "Open Full mode"
  - "Load next group"
  - "Show deferred split comparison"

Silent omission is not allowed.

## Group-Level Behavior

When large results are grouped:

- groups containing `high` review-priority items load before groups containing only `medium` or `low`
- groups containing `remove+add`, `ambiguous`, or `review-required` items load before routine groups
- low-priority groups may stay summarized until expanded

This rule preserves review safety without requiring the entire result to render at once.

## Staged Rendering Expectations

Renderer implementation should assume staged rendering for large results.

The expected stages are:

1. header and over-budget summary
2. highest-priority item or group summaries
3. default mode primary content
4. deferred detail such as expanded evidence, low-priority groups, or split-heavy comparisons

This ticket does not mandate a specific virtualization library or rendering engine strategy. It only fixes the expected user-visible behavior.

## Review-Safe Messaging

Over-budget messaging must make two things clear:

- the system intentionally reduced detail
- the currently shown result is still semantically trustworthy for prioritization

Recommended message shape:

- what happened:
  - "Showing highest-priority changes first"
- why:
  - "This diff exceeds the default inspection budget"
- what remains available:
  - "Additional groups and split detail can be loaded on demand"

Messaging must not imply data loss when the detail is only deferred.

## Non-Goals

This document does not define:

- exact frame-time targets
- exact DOM node limits
- exact virtualization implementation
- rollout thresholds or release gates
- benchmark harness design

Those concerns belong to later implementation, validation, and rollout work.

## Downstream Expectations

- `P3-T1` should include boundary fixtures around Level A/B, B/C, and C/D transitions.
- `P3-T2` should treat over-budget messaging and omission behavior as snapshot-relevant behavior.
- `P3-T3` may use these budget levels as rollout observation signals, but should not change their semantics silently.

## References

- [ADR 0009](./adr/0009-visual-diff-rendering-contract.md)
- [Visual Diff Display Modes](./visual-diff-display-modes.md)
- [Visual Diff Change-Kind UI Rules](./visual-diff-change-kind-rules.md)
