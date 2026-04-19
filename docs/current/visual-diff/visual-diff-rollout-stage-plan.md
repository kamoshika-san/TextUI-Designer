# Visual Diff Rollout Stage Plan

## Purpose

This document defines how Visual Diff should be rolled out from implementation-only availability to reviewer-facing exposure.

It fixes:

1. the stage order
2. the promotion criteria between stages
3. the rollback triggers for each stage
4. the signals maintainers should observe before widening exposure

This plan builds on:

- [ADR 0009](./adr/0009-visual-diff-rendering-contract.md)
- [Visual Diff Performance Budget and Degrade UX](./visual-diff-performance-budget.md)
- [Visual Diff Fixture Inventory](./visual-diff-fixture-inventory.md)
- [Visual Diff Snapshot and Regression Policy](./visual-diff-snapshot-regression-policy.md)

## Rollout Principle

Visual Diff must roll out in increasing exposure order:

1. `local-only`
2. `ci-only`
3. `pr-enabled`

The feature must not skip directly from implementation work to reviewer-visible PR exposure.

The goal of the rollout is not merely to confirm that rendering works. The goal is to preserve reviewer trust by proving that:

- the renderer follows the accepted contract
- snapshot churn stays explainable
- large-result behavior remains review-safe
- fallback and ambiguity signals stay visible under real usage

## Stage Overview

| Stage | Audience | Primary goal | Required confidence |
|-------|----------|--------------|---------------------|
| `local-only` | implementers | verify contract-faithful rendering and basic interaction behavior | stable developer iteration |
| `ci-only` | maintainers and CI observers | verify repeatable fixture, snapshot, and regression behavior | stable non-interactive validation |
| `pr-enabled` | PR reviewers | expose Visual Diff in normal review flow | stable reviewer-facing trust |

## Stage 1: `local-only`

### Intent

`local-only` is the first implementation stage.

At this stage, Visual Diff may exist in the workspace and developer tooling, but it must not yet appear in CI-required review surfaces or default PR review flows.

### Expected signals

- the renderer consumes the `ADR 0009` contract without re-deriving semantics from raw diff artifacts
- representative `VD-*` scenarios render coherently in `Full`
- `Compact` and `Split` behavior is at least manually inspectable for baseline scenarios
- ambiguity, heuristic, fallback, and replacement cues remain visible
- missing navigation states do not produce broken affordances

### Minimum fixture expectation

Local verification must cover at least:

- one normal add/update/remove scenario from `VD-N*`
- one heuristic or ambiguity scenario from `VD-H*` or `VD-A*`
- one navigation edge case from `VD-P*`
- one empty-diff or no-change case from `VD-E01`

### Promotion criteria to `ci-only`

Promote only when all of the following are true:

- contract-layer tests for ViewModel, presentation, and navigation are passing
- renderer snapshots for the currently implemented surface are deterministic in local runs
- no known stage-blocking issue exists for `heuristic`, `ambiguous`, `fallback`, or `replace` visibility
- no known broken path exists for add-only, remove-only, or missing-source navigation states
- the implementation can exercise at least one over-budget scenario path without semantic loss, even if rendering remains partially staged

### Rollback triggers inside `local-only`

Stay in `local-only` or revert local exposure if:

- renderer behavior requires ad hoc contract reinterpretation
- snapshot diffs are unstable without an intentional semantic reason
- large-result handling hides reviewer-critical signals
- navigation affordances are broken or misleading in one-sided states

## Stage 2: `ci-only`

### Intent

`ci-only` proves that Visual Diff behavior is stable under repeatable automation before it becomes part of normal PR review.

At this stage, the feature may run in CI jobs, fixture checks, snapshot jobs, or artifact generation lanes, but it should not yet be treated as a default reviewer-facing surface.

### Expected signals

- `VD-*` scenario coverage is stable and traceable in automated jobs
- contract snapshots and renderer snapshots fail with actionable scenario references
- over-budget behavior is observable through deterministic fixtures rather than manual inspection only
- snapshot churn can be explained against the fixed V0 docs instead of case-by-case interpretation

### Required automated evidence

CI-visible coverage should include:

- contract snapshot lanes tied to stable `VD-*` scenarios
- renderer snapshot lanes for the implemented modes
- at least one budget/degrade lane reflecting `VD-B*` behavior
- scenario reporting that lets maintainers map failures back to the fixture inventory

### Promotion criteria to `pr-enabled`

Promote only when all of the following are true:

- CI snapshot jobs are stable across consecutive runs with no unexplained churn
- failures identify the changed `VD-*` scenario or equivalent stable scenario reference
- no open known issue remains where reviewer-priority ordering is incorrect in `Compact` or degraded `Full`
- budget-level behavior preserves explicit omitted-detail messaging
- reviewer-critical badges and severity signals remain visible in renderer snapshots
- maintainers can describe rollback as a reversible exposure change, not a code archaeology task

### Rollback triggers inside `ci-only`

Roll back to `local-only` if:

- CI repeatedly regenerates snapshots without intentional semantic change
- fixture IDs or scenario naming drift from the canonical inventory
- over-budget lanes are nondeterministic
- the feature produces noisy failures that maintainers cannot interpret quickly

## Stage 3: `pr-enabled`

### Intent

`pr-enabled` is the first stage where Visual Diff may be surfaced in ordinary PR review flow.

At this stage, reviewers may rely on the feature as a supported inspection surface, so trust and rollback speed both matter more than feature breadth.

### Exposure rule

PR exposure should begin conservatively:

- start as advisory review support rather than as a strict merge gate
- preserve existing review paths while Visual Diff proves stable in reviewer-facing usage
- widen default visibility only after reviewer trust is established

This means rollout should favor partial exposure with clear labeling over premature mandatory dependence.

### Required reviewer-facing confidence

- `Compact`, `Full`, and any exposed `Split` behavior are consistent with the accepted display-mode and degrade policies
- reviewer-critical states such as ambiguity, fallback, heuristic review escalation, and replacement remain visible without expansion tricks
- reviewers can interpret missing or deferred detail correctly from the UI messaging alone
- regression failures found after exposure can be traced quickly to scenario IDs and governing docs

### Ongoing promotion within `pr-enabled`

Further widening within `pr-enabled` should depend on:

- low unexplained snapshot churn over time
- no recurring reviewer confusion about badges, omissions, or navigation state
- no recurring rollback events caused by result-size instability

### Rollback triggers from `pr-enabled`

Roll back to `ci-only` if any of the following occurs:

- reviewers report misleading omissions or hidden high-priority items
- ambiguity, heuristic, or fallback states become visually unreliable
- PR-visible runs show unexplained snapshot or fixture drift
- large-result handling causes materially misleading review output

Rollback should mean removing reviewer-facing exposure first, not silently leaving the feature visible in a degraded but untrusted state.

## Stage Signals by Policy Area

### Fixture signals

- `local-only`: representative `VD-N*`, `VD-H*` or `VD-A*`, `VD-P*`, and `VD-E01` cases render coherently
- `ci-only`: stable automated `VD-*` scenario reporting exists
- `pr-enabled`: reviewer-visible failures can still be traced back to stable scenario IDs

### Snapshot signals

- `local-only`: snapshots are locally deterministic for the implemented surface
- `ci-only`: snapshot churn follows the allowed-trigger rules from the snapshot policy
- `pr-enabled`: snapshot changes remain explainable enough that reviewers do not lose trust in the signal

### Performance and degrade signals

- `local-only`: at least one over-budget flow can be exercised without semantic flattening
- `ci-only`: budget/degrade scenarios are automated and stable enough to catch regressions
- `pr-enabled`: omitted-detail messaging and prioritization remain trustworthy in reviewer-facing output

## Promotion Checklist

Before promoting to the next stage, maintainers should confirm:

1. the current stage's expected signals are satisfied
2. failures are actionable rather than noisy
3. reviewer-critical semantics are preserved under degraded and edge-case states
4. rollback can be executed by narrowing exposure rather than inventing a new recovery plan

Promotion should be blocked if the answer to any of these is still unclear.

## Rollback Operating Rule

Rollback must be exposure-first and reversible.

That means:

- first narrow the enabled surface
- then investigate the failing scenarios and policy mismatch
- only re-promote after the failure is mapped to fixture, snapshot, or performance evidence

Rollback should not depend on redefining the rendering contract or rewriting the reviewer-facing semantics under pressure.

## ADR-B Recommendation Boundary

This rollout plan is detailed enough to support implementation and initial enablement without immediately requiring a separate ADR.

ADR-B should be authored only if later implementation introduces non-trivial governance decisions such as:

- multiple independently controlled feature gates
- materially different strict vs advisory exposure paths
- cross-surface rollback ownership that is unclear from normal rollout docs

If those conditions do not arise, existing rollout documents plus this plan are sufficient, and ADR-B can be closed as `doc extension sufficient`.

## Non-Goals

This document does not define:

- exact feature-gate names
- exact CI workflow file changes
- exact PR UI copy
- runtime implementation details for stage toggles

Those decisions belong to implementation and operational follow-up work.

## References

- [ADR 0009](./adr/0009-visual-diff-rendering-contract.md)
- [Visual Diff Fixture Inventory](./visual-diff-fixture-inventory.md)
- [Visual Diff Snapshot and Regression Policy](./visual-diff-snapshot-regression-policy.md)
- [Visual Diff Performance Budget and Degrade UX](./visual-diff-performance-budget.md)
