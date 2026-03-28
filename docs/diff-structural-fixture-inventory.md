# Diff Structural Fixture Inventory

Updated: 2026-03-28
Owner: Maintainer
Related ticket: `T-20260328-201`

## Purpose

This document inventories the representative fixture cases required for structural diff work.

It bridges:

- `docs/diff-acceptance-scenario-matrix.md` for accepted structural outcomes
- `docs/diff-reorder-move-policy.md`, `docs/diff-rename-removeadd-policy.md`, and `docs/diff-similarity-matching-boundary.md` for rule boundaries
- `docs/diff-normalization-fixture-shape.md` and `docs/diff-ai-noise-fixture-mapping.md` for executable fixture vocabulary

This page does not define a runner, snapshot update workflow, or semantic summary text. It only fixes the inventory and grouping needed so later Epic J and Epic G work can encode structural diff cases mechanically.

## Design Goals

The inventory must:

1. cover the settled structural rule families from Epic A and Epic C
2. separate normalization-only baselines from structural diff baselines
3. preserve workflow-relevant paths that later reviewer and PR surfaces will care about
4. stay narrow enough that one fixture family proves one structural concern plus the minimum required evidence

## Fixture Family Boundary

Use this split consistently:

- normalization-only baseline:
  - proves canonicalization equivalence before structural diff starts
  - belongs to `docs/diff-normalization-fixture-shape.md`
  - should not encode reorder, move, rename, or similarity rescue
- structural diff baseline:
  - proves continuity, classification, and conservative fallback after normalized inputs already exist
  - belongs to this inventory
  - may reference normalization fixtures only as upstream prerequisites

Do not mix these two concerns in one representative fixture directory.

## Recommended Layout

Recommended directory layout:

```text
fixtures/
  structural/
    S-001/
      fixture.yml
      previous.tui.yml
      next.tui.yml
      expected.diff.yml
```

Rules:

- the manifest is always `fixture.yml`
- inputs are comparison-side documents, not authored variants of one normalization case
- the expected artifact is a structural diff expectation, not a normalization snapshot
- when one case needs normalized prerequisites, the fixture should reference them rather than duplicating them

## Fixture Manifest Shape

Recommended top-level shape:

```yaml
fixtureId: S-001
kind: structural-diff
caseRef:
  scenarioRef: 1
  ruleFamily: reorder
  sourceDocs:
    - docs/diff-acceptance-scenario-matrix.md
    - docs/diff-reorder-move-policy.md
summary: Same-parent sibling swap with stable fallback identity
inputs:
  previousDslPath: fixtures/structural/S-001/previous.tui.yml
  nextDslPath: fixtures/structural/S-001/next.tui.yml
expectation:
  expectedDiffPath: fixtures/structural/S-001/expected.diff.yml
  primaryEventKind: reorder
  continuityMode: deterministic
preservedEvidence:
  sourceRef: preserve
  explicitness: preserve
  ownership: preserve
workflowSurface:
  representativePath:
    entityPath: /page/components/1
    ownerPath: /page/components
guardrails:
  mustNotNormalize:
    - canonical-order-only
  mustNotClaim:
    - move
notes:
  - Structural diff fixture, not a normalization golden case
```

## Required Fields

Every structural diff fixture should contain:

- `fixtureId`
- `kind`
- `caseRef.scenarioRef`
- `caseRef.ruleFamily`
- `summary`
- `inputs.previousDslPath`
- `inputs.nextDslPath`
- `expectation.expectedDiffPath`
- `expectation.primaryEventKind`
- `expectation.continuityMode`
- `preservedEvidence`
- `workflowSurface.representativePath`
- `guardrails`

Rules:

- `kind` is fixed to `structural-diff`
- `primaryEventKind` must use settled structural vocabulary such as `reorder`, `move`, `rename`, `remove+add`, `add`, or `remove`
- `continuityMode` must be one of:
  - `deterministic`
  - `heuristic-bounded`
  - `none`

## Representative Case Inventory

### 1. Reorder family

Representative fixtures:

- `S-001`: same-parent sibling swap with stable fallback key
- `S-002`: same-parent ordinal shift inside one ordered child collection

Required outcome:

- `primaryEventKind: reorder`
- `continuityMode: deterministic`

Must not claim:

- `move`
- `remove+add`

Workflow path guidance:

- point to the moved sibling path and the owning collection path

### 2. Move family

Representative fixtures:

- `S-010`: cross-parent relocation with stable explicit identity
- `S-011`: slot-to-slot relocation inside one higher-level owner

Required outcome:

- `primaryEventKind: move`
- `continuityMode: deterministic`

Must not claim:

- `reorder`
- `remove+add` when stable identity is present

Workflow path guidance:

- include both previous owner path and next owner path in the expected diff artifact

### 3. Rename-capable same-entity family

Representative fixtures:

- `S-020`: durable-handle rename on stable state or event
- `S-021`: user-facing label change on stable component as a control case

Required outcome:

- `S-020`: `primaryEventKind: rename`
- `S-021`: `primaryEventKind: update`

Must not claim:

- text-only rescue as identity
- `remove+add` unless deterministic identity breaks

Workflow path guidance:

- include the path of the durable handle field or visible label field that changed

### 4. Remove-plus-add conservative fallback family

Representative fixtures:

- `S-030`: kind change with similar wording
- `S-031`: textually similar replacement without stable identity
- `S-032`: cross-screen similar wording with no valid continuity

Required outcome:

- `primaryEventKind: remove+add`
- `continuityMode: none`

Must not claim:

- `rename`
- `move`
- heuristic continuity based only on wording

Workflow path guidance:

- point to the removed entity path and added entity path separately

### 5. Bounded similarity fallback family

Representative fixtures:

- `S-040`: missing-ID same-parent sibling swap with unique best match
- `S-041`: missing-ID property-profile match inside same container
- `S-042`: ambiguous multi-candidate same-parent case as negative control
- `S-043`: cross-parent similar wording as forbidden-zone control

Required outcome:

- `S-040` and `S-041`: deterministic structural event plus `continuityMode: heuristic-bounded`
- `S-042` and `S-043`: `primaryEventKind: remove+add`

Must not claim:

- heuristic rescue across parent or screen boundary
- heuristic winner selection when more than one plausible candidate exists

Workflow path guidance:

- name the candidate owner path explicitly because forbidden-zone reasoning depends on it

### 6. Extension-hook structural family

Representative fixtures:

- `S-050`: transition added
- `S-051`: transition removed
- `S-052`: transition guard changed with stable linkage
- `S-053`: permission-conditioned visibility change on stable owner
- `S-054`: state activation change with stable state identity
- `S-055`: event declaration change with stable owner

Required outcome:

- ownership remains anchored to the owning unit
- extension-sensitive change stays local to the owner path or transition path

Must not claim:

- detached global-blob difference
- mandatory top-level permission unit when the change is only an owner hook update

Workflow path guidance:

- include the owning unit path plus the reserved extension hook path when relevant

## Workflow-Surface Guidance

Every structural fixture should record one `workflowSurface.representativePath`.

This field exists so later Epic G work can choose reviewer-facing anchors without inventing a second case inventory.

Recommended representative paths:

- component path for `reorder`, `move`, `rename`, and `remove+add`
- transition path for transition add/remove/update
- owner path for permission-conditioned or state/event hook changes

Do not overpopulate workflow paths in J1. One representative path per fixture is enough for the inventory stage.

## Relationship To Existing Baselines

Use this translation rule:

- normalization fixture `G-*` or `N*` -> proves canonical precondition only
- structural fixture `S-*` -> proves post-normalization diff behavior

Examples:

- `G-001` canonical-order equivalence may be an upstream prerequisite for `S-001`, but it is not itself a structural diff fixture
- `N5-001` explicit-default noise handling may be an upstream prerequisite for a later structural fixture, but the structural fixture should still name its own continuity and event expectation

## Negative Controls

Every major rule family should include at least one negative control.

Minimum negative controls:

- reorder family:
  - same text but changed owner path should not stay reorder
- move family:
  - similar-looking recreated node without stable identity should not become move
- rename family:
  - label-only change should not become rename if the field is not a durable handle
- similarity family:
  - multi-candidate ambiguity should not heuristically pair
- extension-hook family:
  - copied descriptive text should not be treated as transition or permission identity

## Acceptance Criteria

This inventory is complete enough when:

- every structural rule family from Epic A has at least one representative positive case
- every high-risk false-continuity area has at least one negative control
- fixture families separate normalization-only baselines from structural diff baselines
- workflow-surface anchor paths exist for later Epic G presentation work
- later Epic J runner work can encode fixtures mechanically from this inventory

## Change History

- 2026-03-28: Initial structural diff representative fixture inventory for Diff Engine Epic J / Sprint J1 / `T-20260328-201`.
