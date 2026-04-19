# Diff Heuristic Noise Review Checklist and Tuning Guide (H3-2 / H3-3)

Updated: 2026-03-30
Owner: Maintainer
Related tickets: `T-20260328-219` (H3-2), `T-20260328-220` (H3-3)

## Purpose

This document provides two operational artifacts for maintaining the heuristic
rescue system:

- **H3-2**: A review checklist for evaluating noise-reduction proposals to
  ensure they do not break the deterministic boundary.
- **H3-3**: A heuristic tuning guide and re-entry policy that governs how and
  when calibration changes are permitted.

It specifies:
- the checklist items that any noise-reduction proposal must satisfy before approval
- the tuning sequence (sample → threshold → trace extension)
- the prerequisites that must hold before tuning begins
- the re-entry trigger conditions that move tuning from backlog to active sprint

It does not specify:
- current threshold values (runtime configuration — H2-1 §5)
- acceptance matrix of specific samples (H3-1)
- regression lane execution setup (J3-1)

---

## Part 1 — H3-2: Noise Reduction vs Deterministic Boundary Review Checklist

### 1.1 Purpose

Any proposal to expand heuristic rescue coverage (new signal, threshold
adjustment, new sample category) must be reviewed against this checklist before
it can be dispatched to a Developer sprint.

The checklist is used by: PM, Reviewer, Maintainer.

---

### 1.2 Checklist

#### Section A — Deterministic identity preservation

- [ ] **A1**: The proposal does not change how explicit-id or fallback-key
  identity resolution works.  Heuristic rescue must remain downstream of
  deterministic identity (H2-1 §1 execution order invariant).
- [ ] **A2**: No proposed signal can produce a match that would contradict an
  existing explicit-id or fallback-key assignment.
- [ ] **A3**: The `move` / `rename` / `kind-change` classification produced by
  deterministic rules is unchanged by the proposal.

#### Section B — Forbidden signal prohibition

- [ ] **B1**: The proposal does not introduce `display-text-similarity`,
  `label-match`, or `placeholder-match` as a non-zero-weight signal.
- [ ] **B2**: The proposal does not introduce `sibling-ordinal` or
  `visual-resemblance` as a rescue-triggering signal.
- [ ] **B3**: No secondary scoring pass re-enables a prohibited signal under a
  different name or flag (hidden deterministic-looking tie-break — H2-2 §2).

#### Section C — Forbidden zone integrity

- [ ] **C1**: Cross-screen candidates are still rejected before scoring after
  the change.
- [ ] **C2**: Cross-parent candidates are still rejected before scoring.
  In particular, P5 (ownership flattening) must not become a rescue candidate.
- [ ] **C3**: Kind-change candidates (e.g. Field(type:text) → Field(type:select))
  are still rejected before scoring.
- [ ] **C4**: FZ-01 through FZ-06 all still produce `remove+add` after the
  change.  Run the H1-3 forbidden-zone regression fixtures to confirm.

#### Section D — Normalization boundary

- [ ] **D1**: The proposal does not make the heuristic rescue result dependent
  on pre-normalization input.  Scoring must operate on normalized IR.
- [ ] **D2**: AI-noise normalization (N-buckets) and structural diff identity
  are still separated.  Normalization remains upstream of comparison.

#### Section E — Tie-break prohibition

- [ ] **E1**: If ≥2 candidates survive after the proposed change, the engine
  still declines rescue and falls back to `remove+add`.  MC-01/02/03 must
  still produce `reject-ambiguous`.
- [ ] **E2**: No new signal introduces a secondary sort key that effectively
  breaks ties (H2-2 §1/§2).

#### Section F — Reviewer trust

- [ ] **F1**: Any change to rescue acceptance criteria must be covered by at
  least one new positive fixture and one new negative control fixture.
- [ ] **F2**: The `accept-review` path (medium confidence) must still produce
  a reviewer annotation for signals that previously required attention.

---

## Part 2 — H3-3: Heuristic Tuning Guide and Re-entry Policy

### 2.1 Tuning sequence

Heuristic calibration must follow this order.  Do not skip phases.

```
Phase 1 — Sample expansion
  Add new representative samples to the H1-1/H1-3 catalog.
  Confirm they are correctly classified by the acceptance matrix (H3-1).
  No code changes in this phase.

Phase 2 — Threshold adjustment
  Adjust numeric threshold values in the runtime configuration only.
  Do not change signal weights or band labels.
  Run the full regression suite (J3-1 CI lane) before committing.
  Validate against H1-1/H1-3 fixtures: no allowed sample should regress to
  must-fallback; no forbidden/must-fallback should become allowed.

Phase 3 — Trace extension
  Add or adjust fields in DiffHeuristicTrace (H2-3) if new observable
  evidence types are needed for operator diagnostics.
  Trace extension is additive only — no existing field names change.
  Update J2-2 assertion vocabulary if new stable fields are added.
```

### 2.2 Regression prerequisites

Before beginning any tuning, the following must be true:

1. **J2-1 snapshot baseline is current** — all existing fixtures pass against
   the current snapshot.  Stale snapshots must be updated first.
2. **J3-1 CI lane is operational** — the full regression suite must run
   end-to-end without infrastructure failures.
3. **H3-1 acceptance matrix is reviewed** — the matrix reflects the current
   state of the system before the tuning change.
4. **H3-2 checklist has been applied** — the proposed change has been reviewed
   against all sections before a sprint is dispatched.

### 2.3 Workflow prerequisites

The following workflow-level conditions must hold before tuning a threshold:

1. **G3-2 workflow baselines are stable** — WB-H1/D1/D2/D3 all pass without
   degradation.  A tuning change that breaks workflow baselines is out of scope
   for a threshold adjustment and requires PM escalation.
2. **E2-2 artifact output is stable** — the external diff artifact format
   (E1-2/E1-3) must not require changes as a result of threshold adjustment.
   If it does, the change is a breaking contract change (E3-1) and must go
   through the change checklist (E3-2/E3-3).

### 2.4 Re-entry policy

Tuning is in backlog until the following re-entry conditions are met.

| Condition | Trigger |
|---|---|
| Sample catalog expansion (Phase 1) | At least 3 new real-world AI-noise samples documented and classified in H3-1 |
| Threshold adjustment (Phase 2) | J3-1 CI lane is green AND H1-3 MC-01/02/03 regression suite passes |
| Trace extension (Phase 3) | Phase 2 complete AND at least one operator request for a new diagnostic field is documented |

**Default position**: Tuning is deferred (backlog) until re-entry conditions
are met.  A tuning sprint must not be dispatched solely because developer
capacity is available.  The re-entry trigger must be cited explicitly in the
PM sprint bundle.

### 2.5 Coordination with Epic C/G/J

| Epic | Coordination point |
|---|---|
| Epic C | Deterministic identity rules must be stable before threshold tuning begins (execution order invariant H2-1 §1) |
| Epic G | G3-2 workflow baselines must be passing before Phase 2 |
| Epic J | J3-1 regression lane must be operational before Phase 2; J2-2 assertion vocabulary must be updated in Phase 3 |

---

## 3. What this document does NOT define

- The specific numeric threshold values that result from tuning (runtime config)
- Which specific samples to add in Phase 1 (depends on real-world observation)
- The snapshot update procedure when a threshold change intentionally shifts outcomes (J3-2)
