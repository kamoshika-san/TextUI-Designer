# Diff Regression Guide and Coverage Matrix (J3-3)

Updated: 2026-03-30
Owner: Maintainer
Related ticket: `T-20260328-207`

## Purpose

This document provides the reference coverage matrix for the diff regression
suite and a guide for maintaining coverage when new rules, scenarios, or
thresholds are added.

It specifies:
- which fixture scenarios are required for each coverage area
- the cross-epic coverage boundary (C/G/H/J)
- the guide for adding coverage when diff rules or thresholds change

It does not specify:
- the snapshot format or assertion vocabulary (J2-1 / J2-2)
- the test harness tier definitions (J2-3)
- the lane assignment and CI setup (J3-1)
- the snapshot update procedure (J3-2)

---

## 1. Coverage matrix

### 1.1 Structural identity coverage (Epic C)

| Fixture ID | Description | Test tier | Assertions |
|---|---|---|---|
| CI-01 | Deterministic explicit-id match | A | `eventKind: 'update'`, `pairingClass: 'explicit-id'`, `scoringOutcome: 'skipped'` |
| CI-02 | Fallback-key match | A | `eventKind: 'update'`, `pairingClass: 'fallback-key'`, `scoringOutcome: 'skipped'` |
| CI-03 | Move event (same entity, different parent) | A | `eventKind: 'move'`, `fallbackMarker: 'none'` |
| CI-04 | Rename event (kind-preserving) | A | `eventKind: 'rename'` |
| CI-05 | Remove+add for kind change | A | `eventKind: 'remove'` + `eventKind: 'add'`, `fallbackMarker: 'remove-add-fallback'` |

### 1.2 Heuristic rescue coverage (Epic H)

| Fixture ID | Source | Description | Test tier | Key assertions |
|---|---|---|---|---|
| HH-N1 | H1-1 N1 | Alias collapse rescue | A | `scoringOutcome: 'accept'`, `pairingClass: 'heuristic'` |
| HH-N2 | H1-1 N2 | Canonical typing rescue | A | `scoringOutcome: 'accept'` |
| HH-N3 | H1-1 N3 | Shorthand projection rescue | A | `scoringOutcome: 'accept'` |
| HH-N4 | H1-1 N4 | Wrapper-free rescue (same-parent) | A | `scoringOutcome: 'accept-review'` |
| HH-N5 | H1-1 N5 | Default explicitness rescue | A | `scoringOutcome: 'accept'` |
| HH-N6 | H1-1 N6 | Duplicate collapse rescue | A | `scoringOutcome: 'accept'` |
| HH-FZ01 | H1-3 FZ-01 | Cross-screen — must not rescue | A | `fallbackMarker: 'remove-add-fallback'`, `scoringOutcome: 'skipped'` |
| HH-FZ02 | H1-3 FZ-02 | Cross-parent (P5) — must not rescue | A | `fallbackMarker: 'remove-add-fallback'` |
| HH-FZ03 | H1-3 FZ-03 | Kind change — must not rescue | A | `fallbackMarker: 'remove-add-fallback'` |
| HH-FZ04 | H1-3 FZ-04 | Display-text-only — must not rescue | A | `fallbackMarker: 'remove-add-fallback'` |
| HH-FZ05 | H1-3 FZ-05 | Cross-owner scope — must not rescue | A | `fallbackMarker: 'remove-add-fallback'` |
| HH-FZ06 | H1-3 FZ-06 | Cross-parent, no structural anchor | A | `fallbackMarker: 'remove-add-fallback'` |
| HH-MC01 | H1-3 MC-01 | Three similar buttons, ambiguous | A | `scoringOutcome: 'reject-ambiguous'` |
| HH-MC02 | H1-3 MC-02 | Two matching state records, ambiguous | A | `scoringOutcome: 'reject-ambiguous'` |
| HH-MC03 | H1-3 MC-03 | Sibling profile match, ambiguous | A | `scoringOutcome: 'reject-ambiguous'` |
| HH-BT01 | — | Single candidate, below threshold | A | `scoringOutcome: 'reject-threshold'` |
| HH-NC01 | — | No candidates in scope | A | `scoringOutcome: 'reject-no-candidates'` |

### 1.3 Workflow coverage (Epic G)

| Fixture ID | Source | Description | Test tier | Key assertions |
|---|---|---|---|---|
| WB-H1 | G3-2 | Happy path — full diff result | B | `resultState: 'complete'`, all events present |
| WB-D1 | G3-2 | Partial result — error in one lane | B | `resultState: 'partial'`, `DiffWorkflowError` present |
| WB-D2 | G3-2 | Stale result — cached from prior run | B | `resultState: 'stale'` |
| WB-D3 | G3-2 | No result — pipeline failure | B | `resultState: 'no-result'` |

### 1.4 External artifact coverage (Epic E)

| Fixture ID | Source | Description | Test tier | Key assertions |
|---|---|---|---|---|
| AB-01 | E3-2 | Two-event diff (update + move) | B | Snapshot matches E3-2 baseline |
| AB-02 | E3-2 | Pure add event | B | Snapshot matches E3-2 baseline |
| AB-03 | E3-2 | Pure remove event | B | Snapshot matches E3-2 baseline |
| AB-04 | E3-2 | Heuristic rescue accepted | B | Snapshot matches E3-2 baseline |
| AB-N01 | E3-2 | No-diff result (identical DSLs) | B | Snapshot matches E3-2 baseline |
| AB-N02 | E3-2 | Error path (malformed DSL) | B | Snapshot matches E3-2 baseline |

---

## 2. Coverage guide for rule additions

When a new diff rule is added, the following coverage additions are required:

1. **At minimum one positive fixture**: Shows the new rule triggering correctly.
   Tier-A test, structural layer snapshot + relevant metadata assertion.
2. **At minimum one negative control**: Shows the new rule NOT triggering in the
   adjacent boundary case.  Tier-A test.
3. **H3-1 acceptance matrix updated**: Add the new case to the allowed / forbidden /
   must-fallback zone.
4. **H3-2 checklist reviewed**: Confirm the new rule does not break existing
   forbidden zones or deterministic identity.

---

## 3. Coverage guide for threshold adjustments

When a threshold value is changed (H3-3 Phase 2), the following checks are required:

1. **Run all Tier-A heuristic fixtures**: Verify no previously-passing fixture
   regresses.  In particular:
   - HH-N1–N6 must still produce `accept` or `accept-review`.
   - HH-FZ01–06 must still produce `fallbackMarker: 'remove-add-fallback'`.
   - HH-MC01–03 must still produce `reject-ambiguous`.
2. **Run WB-H1**: The happy path workflow must remain `resultState: 'complete'`.
3. **If any fixture outcome changes**: Follow J3-2 snapshot update procedure.
   Update the snapshot and document the threshold change in the commit message.

---

## 4. Cross-epic coverage boundary

| Epic | Coverage owned by | Cross-boundary note |
|---|---|---|
| C — structural diff rules | CI-01–05 (J3-3) | Epic C rules are upstream of heuristic; CI fixtures must not use heuristic samples |
| G — workflow surface | WB-H1/D1/D2/D3 (J3-3) | G3-2 baselines are the authoritative workflow fixtures |
| H — heuristic rescue | HH-N1–N6, HH-FZ01–06, HH-MC01–03 (J3-3) | H1-1/H1-3 catalog is the source; acceptance matrix (H3-1) governs classification |
| E — external contract | AB-01–AB-N02 (J3-3) | E3-2 artifact baselines are the source; snapshot format is J2-1 |
| J — regression harness | All above (J3-3 matrix) | J3-3 does not own the fixtures; it references them |

---

## 5. What this document does NOT define

- Fixture file content or storage format (J2-1 / J2-3)
- How to update snapshots after an intentional change (J3-2)
- CI lane execution configuration (J3-1)
