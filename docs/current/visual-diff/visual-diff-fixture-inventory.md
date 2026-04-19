# Visual Diff Fixture Inventory

## Purpose

This document defines the initial fixture inventory for Visual Diff.

It does not introduce a new fixture runtime. It fixes which existing assets are reused, which scenario IDs are stable, and which boundary cases later snapshot and renderer tests must share.

This inventory builds on:

- [ADR 0009](./adr/0009-visual-diff-rendering-contract.md)
- [Visual Diff Display Modes](./visual-diff-display-modes.md)
- [Visual Diff Change-Kind UI Rules](./visual-diff-change-kind-rules.md)
- [Visual Diff Performance Budget and Degrade UX](./visual-diff-performance-budget.md)

## Inventory Rules

- Prefer reuse of existing diff and Visual Diff tests before inventing new parallel fixture sets.
- One scenario ID should correspond to one stable reviewer-meaningful case.
- A scenario may feed more than one lane:
  - ViewModel
  - presentation
  - navigation
  - future renderer snapshot
- Scenario IDs in this inventory are the canonical references for later snapshot policy and implementation-phase tests.

## Fixture Lanes

### Lane A: Core semantic regression reuse

Primary source:

- `tests/unit/textui-diff-core-golden-regression.test.js`

Use this lane for canonical change-kind coverage and fallback provenance.

### Lane B: Visual Diff contract reuse

Primary sources:

- `tests/unit/textui-visual-diff-view-model.test.js`
- `tests/unit/textui-visual-diff-presentation.test.js`
- `tests/unit/textui-visual-diff-navigation.test.js`

Use this lane for UI-facing contract behavior, labels, badges, and navigation semantics.

### Lane C: Heuristic and ambiguity overlays

Primary sources:

- `tests/unit/heuristic-forbidden-zone.test.js`
- `tests/unit/heuristic-ambiguity-fallback.test.js`
- `tests/unit/heuristic-trace-output.test.js`

Use this lane for ambiguity-heavy and heuristic-heavy scenarios that later renderer surfaces must still explain safely.

## Stable Scenario Inventory

| Scenario ID | Category | Source Asset | Reuse Purpose | Notes |
|-------------|----------|--------------|---------------|-------|
| `VD-N01` | normal add | `textui-diff-core-golden-regression` add case | baseline add semantics | feeds ViewModel, presentation, Compact |
| `VD-N02` | normal remove | `textui-diff-core-golden-regression` remove case | baseline remove semantics | feeds navigation one-sided before-state |
| `VD-N03` | normal update | `textui-diff-core-golden-regression` deterministic update case | baseline update semantics | feeds Full and Split comparisons |
| `VD-N04` | normal reorder | `textui-diff-core-golden-regression` reorder case | sequence-change semantics | important for Split mode reading |
| `VD-N05` | normal rename | `textui-diff-core-golden-regression` rename case | identity relabeling semantics | must stay distinct from update and replacement |
| `VD-N06` | normal move | current move-capable golden or later move regression source | relocation semantics | required as soon as move fixture is anchored in renderer lane |
| `VD-H01` | heuristic review | `textui-visual-diff-presentation.test.js` heuristic review badge case | heuristic + review-required cue | baseline heuristic overlay |
| `VD-H02` | heuristic accept trace | `heuristic-trace-output.test.js` accepted heuristic trace case | heuristic explanation coverage | future renderer evidence lane |
| `VD-A01` | remove+add fallback | `textui-diff-core-golden-regression` remove+add case | replacement baseline | critical fallback semantics |
| `VD-A02` | ambiguity tie fallback | `heuristic-ambiguity-fallback.test.js` tie-best-score case | ambiguity fallback semantics | high-attention reviewer state |
| `VD-A03` | heuristic forbidden-zone reject | `heuristic-trace-output.test.js` forbidden-zone rejection case | rejected heuristic semantics | boundary-path explanation case |
| `VD-E01` | empty diff | identical/no-change baseline from core golden regression and empty external payload tests | no-change rendering | required for zero-state UX |
| `VD-P01` | navigation add-only | `textui-visual-diff-navigation.test.js` add one-sided case | before-missing but expected | Compact and Split navigation behavior |
| `VD-P02` | navigation remove-only | `textui-visual-diff-navigation.test.js` remove one-sided case | after-missing but expected | one-sided path behavior |
| `VD-P03` | navigation both sides | `textui-visual-diff-navigation.test.js` update two-sided case | full comparison path behavior | Full and Split baseline |
| `VD-P04` | navigation missing source/path | `textui-visual-diff-navigation.test.js` no-path/no-source case | explicit degraded navigation state | fallback copy and muted unavailable state |
| `VD-D01` | Compact truncation | planned composition from `reviewPriority` ordering plus representative multi-item set | top-N behavior | used by snapshot policy later |
| `VD-D02` | Full grouped evidence | planned composition from narrative/evidence grouping plus representative multi-item set | grouping behavior | future renderer snapshot baseline |
| `VD-D03` | Split replacement compare | planned composition using `remove+add` + navigation state | replacement comparison behavior | validates before/after lanes |
| `VD-B01` | budget level B | planned large-result inventory assembled from mixed normal items | moderate collapse threshold | validates default collapsed evidence |
| `VD-B02` | budget level C | planned large-result inventory with high/low mixed priority | over-budget staged rendering | validates deferred groups |
| `VD-B03` | budget level D | planned extreme-result inventory with explicit omitted-detail messaging | extreme degrade path | validates mandatory over-budget notice |

## Required Coverage by Concern

### Change kinds

The inventory must cover:

- add
- remove
- update
- reorder
- move
- rename
- remove+add

Current status:

- add, remove, update, reorder, rename, remove+add are already mapped to concrete reuse sources.
- move is required and tracked in this inventory, but the concrete reusable source should be locked from the move-capable regression lane before renderer snapshots start.

### State overlays

The inventory must cover:

- heuristic-derived state
- ambiguity state
- fallback state
- replacement state
- empty / no-change state

### Navigation states

The inventory must cover:

- before-only navigation
- after-only navigation
- both-side navigation
- missing path/source fallback state

### Degrade states

The inventory must cover:

- in-budget baseline
- moderate collapse
- over-budget staged rendering
- extreme-result explicit omission messaging

## Reuse Map

### Directly reusable now

- `tests/unit/textui-diff-core-golden-regression.test.js`
- `tests/unit/textui-visual-diff-view-model.test.js`
- `tests/unit/textui-visual-diff-presentation.test.js`
- `tests/unit/textui-visual-diff-navigation.test.js`
- `tests/unit/heuristic-ambiguity-fallback.test.js`
- `tests/unit/heuristic-trace-output.test.js`

### Requires composition later

The following scenarios are not single existing fixtures yet and should be assembled during implementation/snapshot work from the reused cases above:

- `VD-D01`
- `VD-D02`
- `VD-D03`
- `VD-B01`
- `VD-B02`
- `VD-B03`

These are still valid stable IDs now. Snapshot policy and renderer tests should compose them rather than rename them.

## Gaps and Follow-Up Notes

- `move` needs an explicit fixture anchor in the Visual Diff-facing reuse map before renderer snapshots begin.
- Budget-level scenarios are policy-backed but not yet executable fixtures; `P3-T2` should define how they materialize in snapshot lanes.
- This inventory intentionally avoids duplicating core fixtures into a separate file tree until implementation confirms a real need.

## Downstream Expectations

- `P3-T2` should use these scenario IDs as the canonical snapshot reference names.
- Implementation-phase renderer tests should cite these IDs in test names or fixture manifests where practical.
- If a future ticket adds a new Visual Diff semantic state, it should extend this inventory instead of creating an untracked side fixture set.

## References

- `tests/unit/textui-diff-core-golden-regression.test.js`
- `tests/unit/textui-visual-diff-view-model.test.js`
- `tests/unit/textui-visual-diff-presentation.test.js`
- `tests/unit/textui-visual-diff-navigation.test.js`
- `tests/unit/heuristic-ambiguity-fallback.test.js`
- `tests/unit/heuristic-trace-output.test.js`
