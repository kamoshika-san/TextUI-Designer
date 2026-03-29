# Diff Workflow Rollout Checklist and Operator Guide (G3-3)

Updated: 2026-03-29
Owner: Maintainer
Related ticket: `T-20260328-194`

## Purpose

This document provides the rollout checklist and operator guide for staged
deployment of the TextUI diff workflow.  It covers prerequisites, enablement
sequencing, fallback procedures, and the signals that reviewers, maintainers,
and operators need to monitor.

It does not specify:
- How feature gates are configured (G3-1)
- End-to-end baseline scenarios (G3-2)
- External schema compatibility policy (E3)

---

## 1. Rollout stages

The diff workflow is introduced in three stages aligned to the G3-1 enablement
axes:

| Stage | Axis | Gates to enable | Prerequisite |
|---|---|---|---|
| Stage 1 | `local-only` | (none) | Core diff engine (Epic C) tests passing |
| Stage 2 | `ci-only` | `artifactOutput`, `checkRunGate` | Stage 1 stable; E2-2 artifact output verified |
| Stage 3 | `pr-enabled` | `summaryOutput`, `prComment` | Stage 2 stable; D2/D3 summary layer verified; G2-1 adapter verified |

Each stage must be stable (no unexpected `DiffWorkflowError` in CI) for at
least one sprint cycle before promoting to the next stage.

---

## 2. Prerequisites checklist

Before enabling Stage 1:

- [ ] `src/core/textui-core-diff.ts` compiles without errors
- [ ] Golden regression tests passing (`tests/unit/textui-diff-core-golden-regression.test.js`)
- [ ] D2-x rule layer tests passing (`tests/unit/textui-diff-d2-rule-layer.test.js`)
- [ ] `buildDiffResultExternal()` projection (E1-3) implemented and tested
- [ ] Diff result validates against `schemas/diff-result-external-v0.json`

Before enabling Stage 2 (`ci-only`):

- [ ] Stage 1 stable for ≥1 sprint cycle
- [ ] `writeDiffArtifact()` (E2-2) implemented and file write verified
- [ ] Artifact file readable by regression harness (J2-1 compatible)
- [ ] `buildDiffCheckRunResult()` (G2-2) implemented

Before enabling Stage 3 (`pr-enabled`):

- [ ] Stage 2 stable for ≥1 sprint cycle
- [ ] `assembleSummaryNarrative()` (D2-3) and `buildDiffPRCommentPayload()` (G2-1) implemented
- [ ] `renderDiffPRComment()` (D3-2) implemented and reviewed
- [ ] Summary baseline tests passing (D3-3)
- [ ] PR comment posts correctly to test PR in staging environment

---

## 3. Enablement procedure

**To promote from Stage N to Stage N+1:**

1. Verify all Stage N+1 prerequisites are checked.
2. Update `diffWorkflow.enablementAxis` in project config.
3. Enable specific feature gates for Stage N+1 (one at a time, not all at once).
4. Run a manual diff on a representative document pair; verify output matches WB-H1 baseline.
5. Observe CI runs for 24 hours; check for unexpected `DiffWorkflowError` entries.
6. If no regressions: leave enabled.  If regressions: disable immediately (see section 5).

**Feature gate enablement order within Stage 3:**

1. `summaryOutput` first (verify summary generation without PR posting)
2. `prComment` second (verify PR comment posts correctly)
3. `extensionHooks` last (verify no hook causes unexpected classification changes)

---

## 4. Signal table by role

| Role | Signal to watch | Location |
|---|---|---|
| **Reviewer** | Unexpected `containsAmbiguity: true` findings on clean PRs | PR comment attention banner |
| **Reviewer** | `heuristicDerived: true` items in findings | PR comment finding rows |
| **Maintainer** | `DiffWorkflowError.errorKind` in CI logs | CI log / artifact diagnostics |
| **Maintainer** | Summary baseline drift (D3-3 regression) | CI test output |
| **Operator** | Check-run gate signal (`warn`/`fail`) on green PRs | GitHub check-run status |
| **Operator** | Artifact file growth in `.textui/diff-artifacts/` | File system / storage monitoring |
| **Operator** | Missing sidecar `.summary.json` when `summaryOutput` is enabled | Artifact directory |

---

## 5. Rollback procedure

**If an unexpected regression is observed after gate promotion:**

1. Set the promoted gate(s) back to `false` in project config.
2. If axis was promoted, revert `diffWorkflow.enablementAxis` to the previous value.
3. Create a PM escalation ticket with: error kind, observed signal, affected gate, repro steps.
4. Do not re-promote until the root cause is identified and a fix is in place.

**Rollback is always safe** — disabling a gate does not affect the core diff
computation or delete existing artifacts.

---

## 6. Advisory vs strict mode guidance

| Situation | Recommended mode |
|---|---|
| Initial rollout (Stage 1-2) | `advisory` always |
| Stage 3 on a non-critical branch | `advisory` |
| Stage 3 on main / release branch | `strict` (after confirming baseline stability) |
| Hotfix / emergency deploy | `advisory` temporarily; return to `strict` after stabilization |

Never enable `strict` mode before the summary baseline (D3-3) tests are green.
A baseline mismatch in strict mode will block CI.

---

## 7. Release note anchor points

When publishing a release that includes diff workflow features:

- Reference G3-1 doc for config surface changes
- Reference E1-1 schema version for external contract changes
- Reference G2-3 for degraded output behavior consumers should expect
- Reference D3-3 summary baseline version for summary wording changes

---

## 8. What this document does NOT define

- Feature gate configuration syntax (G3-1)
- Baseline fixture update procedure (D3-3, E3-2)
- PR API authentication for comment posting (G2 integration)
- Artifact retention / cleanup policy (infrastructure concern)
