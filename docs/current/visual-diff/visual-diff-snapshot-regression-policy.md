# Visual Diff Snapshot and Regression Policy

## Purpose

This document defines how Visual Diff snapshots and regression baselines should be maintained once implementation starts.

It answers three questions:

1. what must be snapshotted
2. when snapshots may be updated
3. what reviewers must expect when a Visual Diff change touches snapshot-bearing behavior

This policy builds on:

- [ADR 0009](./adr/0009-visual-diff-rendering-contract.md)
- [Visual Diff Display Modes](./visual-diff-display-modes.md)
- [Visual Diff Change-Kind UI Rules](./visual-diff-change-kind-rules.md)
- [Visual Diff Performance Budget and Degrade UX](./visual-diff-performance-budget.md)
- [Visual Diff Fixture Inventory](./visual-diff-fixture-inventory.md)

## Snapshot Layers

Visual Diff should maintain two distinct snapshot layers.

### Layer 1: Contract snapshots

Purpose:

- protect semantic shape and deterministic mappings before renderer layout details matter

Scope:

- ViewModel output
- presentation output
- navigation output

Primary concern:

- contract drift

### Layer 2: Renderer snapshots

Purpose:

- protect user-visible behavior of the implemented renderer

Scope:

- grouped display output
- Compact / Full / Split behavior
- over-budget messaging and collapsed-state behavior
- change-kind visual distinctions as they appear to the user

Primary concern:

- user-visible regression

These layers must not be merged into one undifferentiated snapshot lane. A change may affect one layer without affecting the other.

## Canonical Fixture References

All Visual Diff snapshot and regression work must reference the stable `VD-*` scenario IDs from [Visual Diff Fixture Inventory](./visual-diff-fixture-inventory.md).

Rules:

- do not invent ad hoc fixture labels inside snapshot files
- do not rename `VD-*` IDs locally per test file
- if a new semantic case is needed, extend the inventory first or in the same slice

## Contract Snapshot Scope

Contract snapshots should capture only stable, review-meaningful outputs.

They should include:

- `changeKind`
- severity tone / severity-bearing mapping outputs
- badge-bearing outputs
- navigation availability and missing-state outputs
- deterministic ordering or grouping identifiers when the contract defines them
- stable fixture ID / scenario ID references

They should not capture:

- incidental implementation formatting
- renderer-specific DOM structure
- non-semantic whitespace or incidental object key order if the contract does not care about it

## Renderer Snapshot Scope

Renderer snapshots should capture user-visible behavior, not implementation noise.

They should include:

- mode-specific visible item selection
- grouping behavior in `Full`
- before/after lane behavior in `Split`
- collapsed / expanded default states that are part of the spec
- over-budget messaging and omitted-detail affordances
- visible change-kind distinctions and badge presence

They should not capture:

- unstable implementation wrappers
- non-user-visible helper structure
- layout internals that do not affect reviewer meaning

## Required Baseline Modes

When renderer snapshots exist, the baseline expectations are:

- `Full` is the baseline fixture/snapshot mode for comprehensive behavior
- `Compact` is a targeted snapshot lane for truncation and prioritization behavior
- `Split` is a targeted snapshot lane for before/after comparison behavior

This mirrors the display-mode policy and avoids treating all three modes as equal default baselines.

## Snapshot Update Triggers

Snapshot updates are allowed only when one of the following is true.

### Allowed trigger A: intentional contract change

Examples:

- severity mapping intentionally changed
- badge semantics intentionally changed
- navigation missing-state semantics intentionally changed
- fixture inventory meaningfully expanded or corrected

Expected action:

- update contract snapshots
- update any renderer snapshots affected by the same semantic change
- explain the semantic reason in the same PR

### Allowed trigger B: intentional renderer behavior change within approved specs

Examples:

- `Compact` truncation behavior implemented according to the existing spec
- `Split` lane messaging becomes newly visible because the feature was implemented
- grouped evidence defaults become visible in `Full`

Expected action:

- update renderer snapshots only where the implemented user-visible behavior changed
- do not update contract snapshots unless the semantic contract itself changed

### Allowed trigger C: fixture inventory expansion

Examples:

- a previously planned `VD-*` composed scenario becomes executable
- the `move` fixture gap is closed with an explicit reuse source

Expected action:

- add the new snapshot or regression coverage
- update the inventory and any policy references in the same slice

## Snapshot Update Non-Triggers

The following are not valid reasons to update snapshots by themselves:

- implementation refactor with no semantic or visible behavior change
- incidental formatting churn
- unstable wrapper or helper changes
- convenience renaming outside the fixture inventory
- CI-only differences caused by unapproved snapshot regeneration

Default stance:

- when in doubt, treat a snapshot diff as a regression until an intentional-change case is clearly shown

## Reviewer Expectations

When a PR changes Visual Diff snapshots, reviewers should expect the author to provide:

- which `VD-*` scenarios changed
- whether the change is contract-level, renderer-level, or both
- which governing doc or ticket justifies the change
- whether unaffected scenarios remained stable

Reviewers should reject snapshot-only updates that:

- lack a semantic explanation
- update unrelated scenarios without explanation
- rely on implementation noise rather than user-visible or contract-visible behavior

## Author Checklist for Snapshot Changes

When updating Visual Diff snapshots, the author should confirm:

1. the changed scenarios are identified by stable `VD-*` IDs
2. the cause is intentional and documented
3. unaffected scenarios did not drift unexpectedly
4. contract and renderer layers were updated only where appropriate
5. any inventory or policy drift was updated in the same slice

## Regression Triage Rule

Use this triage order when a Visual Diff regression fails:

1. determine the affected `VD-*` scenario ID
2. determine whether the failure is contract-layer or renderer-layer
3. check whether a governing doc intentionally changed
4. if no intentional semantic change exists, treat it as a regression
5. if intentional, update the relevant snapshot layer and explain why unaffected layers stayed stable or changed too

## CI and Workflow Expectations

- CI must not silently regenerate Visual Diff snapshots.
- Snapshot updates are a deliberate review action, not a background maintenance step.
- Regression jobs should report scenario IDs where possible so failures map directly back to the inventory.

## Relationship to Existing Diff Regression Docs

Existing diff regression docs remain authoritative for the generic diff engine lanes.

This document narrows that logic to the Visual Diff preparation and implementation surface:

- use the same intentional-change discipline
- use the Visual Diff inventory as the scenario namespace
- separate contract-layer and renderer-layer snapshot decisions

## Non-Goals

This document does not define:

- exact snapshot file format
- exact renderer test framework
- rollout-gate behavior
- performance thresholds beyond the existing degrade policy

Those decisions belong to later implementation and rollout work.

## References

- [Visual Diff Fixture Inventory](./visual-diff-fixture-inventory.md)
- [Visual Diff Display Modes](./visual-diff-display-modes.md)
- [Visual Diff Change-Kind UI Rules](./visual-diff-change-kind-rules.md)
- [Visual Diff Performance Budget and Degrade UX](./visual-diff-performance-budget.md)
- [ADR 0009](./adr/0009-visual-diff-rendering-contract.md)
