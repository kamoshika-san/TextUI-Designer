# Diff Regression Failure Triage and Snapshot Update Policy (J3-2)

Updated: 2026-03-30
Owner: Maintainer
Related ticket: `T-20260328-206`

## Purpose

This document defines the procedure for triaging a diff regression failure and
the policy for updating snapshots when a failure represents an intentional
change rather than a regression.

It specifies:
- the decision tree for classifying a snapshot diff failure
- the snapshot update procedure and its constraints
- the CI blocking rule and its escape hatch
- the parallel relationship to E3-2 artifact baseline and D3-3 summary baseline
  update policies

It does not specify:
- the snapshot format or assertion vocabulary (J2-1 / J2-2)
- the lane assignment for each test category (J3-1)
- the coverage matrix (J3-3)

---

## 1. Failure classification decision tree

When a diff regression test fails due to a snapshot mismatch, the developer
must determine whether the failure is a **regression** or an **intentional change**
before taking action.

```
Snapshot diff failure detected
│
├─ Is this the first run after a code change?
│   ├─ No: Likely infrastructure or environment flakiness → investigate first
│   └─ Yes: Continue below
│
├─ Did the code change intentionally affect diff behavior?
│   ├─ No: This is a REGRESSION — fix the code, do not update the snapshot
│   └─ Yes: Continue below
│
├─ Is the affected field in the stable snapshot layer (J2-1 §1.2)?
│   ├─ No (it is a volatile field): The snapshot should not have asserted this field — fix the test
│   └─ Yes: Continue below
│
└─ Does the change satisfy the H3-2 review checklist?
    ├─ No: The code change is out of policy — revert and escalate to PM
    └─ Yes: This is an INTENTIONAL CHANGE — update the snapshot (section 3)
```

**Default classification**: When in doubt, treat the failure as a regression.
Do not update snapshots without completing the decision tree.

---

## 2. Regression vs intentional change criteria

| Signal | Likely regression | Likely intentional change |
|---|---|---|
| Structural layer mismatch (eventKind/pairingClass/fallbackMarker) | Yes, unless a rule changed | Only if diff rule was explicitly changed |
| scoringOutcome changed | Yes, unless threshold was adjusted | Only after H3-3 Phase 2 (threshold adjustment) |
| reasonSummary prefix changed | Usually regression | Only if trace format was explicitly updated |
| Volatile field (topScore, decisionReason) mismatch | Test defect — should not be asserted | N/A — fix the test, not the snapshot |

---

## 3. Snapshot update procedure

When a snapshot mismatch is confirmed as an intentional change, the snapshot
update procedure is:

1. **Verify locally**: Run `npm test -- --update-snapshots` to generate new
   snapshot files.  Inspect the diff between old and new snapshots manually.
2. **Confirm scope**: Only the snapshots for the intentionally-changed fixtures
   should differ.  If unrelated snapshots changed, investigate before proceeding.
3. **Apply the H3-2 review checklist** (if the change involves heuristic tuning):
   All applicable checklist items must pass before the updated snapshots are
   committed.
4. **Commit snapshot and code together**: The snapshot update must be in the
   same commit as the code change that caused it.  Do not commit snapshot
   updates in isolation.
5. **Tag the commit**: The commit message must mention which snapshot contract
   (structural or metadata layer) was updated and why.

---

## 4. CI snapshot update block

Snapshot updates are blocked in CI.  The CI job must not pass `--update-snapshots`.

If a CI run produces a snapshot diff failure, the correct response is:
1. Pull the CI failure log.
2. Reproduce locally.
3. Follow the decision tree (section 1) to classify the failure.
4. If intentional: update snapshots locally, then push.
5. If regression: fix the code.

**Escape hatch**: There is no automated escape hatch.  CI snapshot failures
always require a human decision.

---

## 5. Parallel update policy alignment

The snapshot update procedure above runs in parallel with two existing baseline
update policies:

| Baseline | Policy document | Alignment |
|---|---|---|
| E3-2 artifact baseline (AB-01–06) | `diff-external-artifact-baseline-and-change-checklist.md` | Same decision-tree principle: intentional contract change must satisfy E3-2 §6 checklist before baseline update |
| D3-3 summary baseline (SB-01–12) | `diff-summary-representative-baseline.md` | Same principle: exact-match fields updated only when behavior intentionally changed |

**Key difference**: E3-2 and D3-3 baseline updates require the E3-1 contract
version bump check.  J2-1 snapshot updates do not change the external contract
and do not require a version bump unless the snapshot format itself changes
(which is a J2-1 contract change requiring its own review).

---

## 6. What this document does NOT define

- Which snapshots must exist (J3-3 coverage matrix)
- How the regression lane is structured in CI (J3-1)
- Snapshot format details (J2-1)
