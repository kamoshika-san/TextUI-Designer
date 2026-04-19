# Diff Compare Workflow Test Harness (J2-3)

Updated: 2026-03-30
Owner: Maintainer
Related ticket: `T-20260328-204`

## Purpose

This document defines the test harness policy for the diff compare workflow,
covering the full pipeline from normalize → compare → summary → workflow
projection.  It specifies the execution tiers, the boundary between unit-like
and workflow-like tests, and the reusable helper contract shared by the local
and CI lanes.

It specifies:
- the two harness execution tiers and their invariants
- which Epic G workflow baseline scenarios map to each tier
- the reusable helper shape and what it must not import
- the local vs CI lane boundary

It does not specify:
- snapshot format or assertion vocabulary (J2-1 / J2-2)
- CI lane file layout or test runner configuration (J3-1)
- snapshot update policy or failure triage (J3-2)
- score band thresholds or heuristic tuning (H3-3)

---

## 1. Execution tier taxonomy

The harness separates tests into two tiers to prevent slow end-to-end tests
from blocking fast local feedback.

### Tier A — Unit-like fixture execution

**Definition**: A Tier-A test executes a single, bounded pipeline stage in
isolation using a pre-normalized in-memory fixture.  The test does not touch
the filesystem, spawn processes, or read config files at runtime.

**Properties**:
- Input: inline JSON fixture (or imported fixture constant)
- Output: asserted against the J2-1 snapshot contract and J2-2 vocabulary
- Scope: one pipeline stage per test (normalize, compare, summary, or projection)
- Execution cost: fast — suitable for `npm test` pre-commit hook

**Examples**: positive case P1–P5, negative controls N1–N6, heuristic rescue
decision tests (all from H1-1/H1-2/H1-3).

### Tier B — Workflow-like end-to-end execution

**Definition**: A Tier-B test exercises the full `normalize → compare →
summary → workflow projection` chain using file-backed fixtures and the same
entry points that the production CLI and CI workflow use.

**Properties**:
- Input: fixture DSL file pair (prev/next) on disk
- Output: asserted against workflow baseline scenarios (G3-2)
- Scope: full pipeline, one scenario per test
- Execution cost: slower — CI lane only by default; opt-in locally via flag

**Examples**: WB-H1 (happy path), WB-D1/D2/D3 (degraded output scenarios).

---

## 2. Workflow baseline scenario mapping

| Scenario | Source | Tier | Key assertions |
|---|---|---|---|
| WB-H1 happy path | G3-2 | Tier B | Full event list, no degraded state, `DiffWorkflowResultState: 'complete'` |
| WB-D1 partial result | G3-2 | Tier B | `resultState: 'partial'`, at least one `DiffWorkflowError` in output |
| WB-D2 stale result | G3-2 | Tier B | `resultState: 'stale'`, stale marker present |
| WB-D3 no-result | G3-2 | Tier B | `resultState: 'no-result'`, degraded output policy applied |
| H1-3 MC-01/02/03 | H1-3 | Tier A | `scoringOutcome: 'reject-ambiguous'` or `'reject-no-candidates'` |
| H1-1 N1–N6 (rescue candidates) | H1-1 | Tier A | `pairingClass: 'heuristic'`, `fallbackMarker: 'heuristic-pending'` |
| H1-2 negative controls | H1-2 | Tier A | `fallbackMarker: 'remove-add-fallback'` or `'none'` |

---

## 3. Reusable helper contract

Both tiers share a set of reusable helpers.  These helpers form the stable
boundary between test code and the harness.

### 3.1 Helper responsibilities

| Helper | Tier | Responsibility |
|---|---|---|
| `buildFixtureInput(fixture)` | A | Construct a `DiffInput` from an inline fixture object |
| `runCompare(input)` | A | Execute the compare stage; return `DiffResult` |
| `runSummary(result)` | A | Execute the summary stage; return `DiffSummary` |
| `runWorkflowFromFiles(prevPath, nextPath, config)` | B | Run full pipeline from file paths |
| `loadWorkflowBaseline(scenarioId)` | B | Load a G3-2 baseline fixture by scenario ID |
| `assertSnapshot(result, snapshotPath)` | A+B | Compare result against persisted snapshot (J2-1) |
| `assertMetadata(event, assertions)` | A+B | Apply J2-2 assertion vocabulary to a single event |

### 3.2 No-internal-import invariant

Helpers must **not** import from internal implementation modules directly.
All access must go through the same public entry points that the CLI and
external consumers use.

Rationale: The C3-3 golden regression pattern uses `require('out/')` on the
compiled output.  The harness helpers must follow the same rule to avoid tests
that pass in dev but break after compilation.

### 3.3 Config isolation

Tier-B helpers must not read from the user's local `textui.config.*` file.
All configuration must be passed explicitly via `config` parameter.

This ensures that Tier-B tests are reproducible across machines and CI
environments regardless of local developer settings (G3-1 feature gate state).

---

## 4. Local vs CI lane boundary

| Concern | Local lane | CI lane |
|---|---|---|
| Tier-A tests | Always runs | Always runs |
| Tier-B tests | Opt-in via `--workflow` flag | Always runs |
| Snapshot update | `--update-snapshots` flag | Blocked (fails on diff) |
| Fixture files | Checked in under `test/fixtures/` | Same |
| Config source | Explicit object, never local config | Same |
| Parallel execution | Optional | Required |

The CI lane must run all tiers.  A CI build that skips Tier-B tests does not
satisfy the regression requirement for workflow coverage.

---

## 5. Alignment with C3-3 golden regression pattern

C3-3 defines the existing Mocha + CommonJS `require('out/')` pattern for
golden regression tests.  The J2-3 harness extends this pattern:

- Tier-A tests follow the same Mocha structure and `require('out/')` convention.
- Tier-B tests are added as a separate Mocha suite gated behind the `--workflow`
  flag so they do not slow down the existing golden regression run.
- No new test runner dependency is introduced.

---

## 6. What this document does NOT define

- Snapshot file naming conventions (J3-1)
- How to update or regenerate snapshots (J3-2)
- Coverage matrix for which fixture scenarios must exist (J3-3)
- Numeric threshold values affecting test outcomes (H3-3)
- The full list of fixtures to create (H1-1 / H1-2 / H1-3 for Tier A; G3-2 for Tier B)
