# Diff Heuristic Acceptance Matrix (H3-1)

Updated: 2026-03-30
Owner: Maintainer
Related ticket: `T-20260328-218`

## Purpose

This document provides the acceptance matrix for heuristic rescue decisions.
It maps every sample category from H1-1/H1-2/H1-3 to one of three zones
(allowed / forbidden / must-fallback) and serves as the authoritative reference
for reviewers and regression work.

It specifies:
- the three acceptance zones and their invariants
- the per-sample zone assignment for all H1-x cases
- the coverage map connecting zones to confidence tiers and fallback states

It does not specify:
- scoring band thresholds (H2-1)
- tie-break prohibition rules (H2-2)
- trace surface for accepted/rejected rescues (H2-3)
- fixture storage format (J2-1)

---

## 1. Acceptance zone definitions

| Zone | Definition | Outcome |
|---|---|---|
| **Allowed** | Heuristic rescue is permitted if scoring threshold is met | `accept` or `review` tier (H2-1 §3) |
| **Forbidden** | Rescue is always rejected regardless of score | `remove+add` — forbidden zone filter applied before scoring (H2-1 §1) |
| **Must-Fallback** | Rescue is declined after scoring — ambiguity, below-threshold, or no-candidates | `remove+add` with fallback trace (H2-2 §3/4) |

**Invariant**: A forbidden-zone case must never reach scoring.  The pre-condition
filters in H2-1 §1 (cross-screen, cross-parent, kind-change, display-text-only)
must remove it before scoring runs.  Any forbidden-zone case that reaches scoring
is a pre-condition implementation defect.

---

## 2. Allowed zone — rescue candidate cases

These cases may proceed to heuristic scoring.  The final outcome (accept / review /
reject) depends on the score relative to H2-1 thresholds.

### 2.1 H1-1 N-bucket rescue candidates

| Sample ID | Description | Expected tier (at threshold) | Key signals |
|---|---|---|---|
| N1 | Alias collapse (label→name key rename) | `accept` | `canonical-kind`, `owner-scope`, `fallback-key-match` |
| N2 | Canonical primitive typing (type enum vs string) | `accept` | `canonical-kind`, `owner-scope`, `property-shape` |
| N3 | Shorthand projection (expanded vs shorthand type) | `accept` | `canonical-kind`, `owner-scope`, `property-shape` |
| N4 (same-parent) | Wrapper-free shape (Button promoted within same parent) | `review` | `canonical-kind`, `slot-placement` |
| N5 | Default explicitness change | `accept` | `canonical-kind`, `owner-scope`, `property-shape` |
| N6 | Duplicate collapsed | `accept` | `canonical-kind`, `owner-scope`, `fallback-key-match` |

### 2.2 Single-candidate accept cases

These are single-candidate scenarios where no ambiguity exists and the score
is expected to reach the accept or review tier:

- One candidate survives bounded filtering
- Score ≥ 0.7 → `accept` tier
- Score 0.4–0.69 → `review` tier (rescue with annotation)
- Score < 0.4 → `reject` → must-fallback (below-threshold)

---

## 3. Forbidden zone — rescue always prohibited

These cases must be rejected before scoring.  Any candidate in a forbidden zone
must not appear in the scoring candidate set.

| Case ID | Description | Forbidden reason | Pre-condition filter |
|---|---|---|---|
| FZ-01 | Button in screen A vs similar in screen B | Cross-screen boundary | Same-screen filter |
| FZ-02 | Input field promoted out of Form to sibling level | Cross-parent scope (P5) | Same-parent filter |
| FZ-03 | Text input replaced by select (same label) | Kind change | Same-kind filter |
| FZ-04 | Same label text in two different containers | Display-text-only similarity | Prohibited signal filter |
| FZ-05 | Nav item in Header vs similar in Footer | Different owner scope | Same-parent filter |
| FZ-06 | Component regenerated in different subtree, similar properties | Cross-parent, no structural anchor | Same-parent filter |
| P4 | Free-text paraphrase (Submit → Send) | Label-only similarity (prohibited signal) | Prohibited signal filter |
| P5 | Ownership flattening (moved out of Form) | Structural move, cross-parent | Same-parent filter |
| P1 | Genuine structural change | Must remain visible as diff | Not a rescue candidate |
| P2 | Undocumented alias (meaningful difference) | Alias is semantically significant | Not a rescue candidate |
| P3 | Context-sensitive default | Context changes meaning | Not a rescue candidate |

---

## 4. Must-fallback zone — rescue declined after scoring

These cases reach scoring but rescue is declined.  They produce `remove+add`
with a fallback trace.

### 4.1 Multi-candidate ambiguity (H1-3 negative controls)

| Case ID | Description | Fallback state | scoringOutcome |
|---|---|---|---|
| MC-01 | Three similar buttons in same parent, one removed | `ambiguous` | `reject-ambiguous` |
| MC-02 | Two matching state records, one disappears | `ambiguous` | `reject-ambiguous` |
| MC-03 | Renamed component, sibling has similar profile | `ambiguous` | `reject-ambiguous` |

All MC cases produce `fallbackMarker: 'remove-add-fallback'` and `DiffFallbackConfidence: 'not-applicable'`.

### 4.2 Below-threshold (single candidate, score too low)

| Scenario | Description | Fallback state | scoringOutcome |
|---|---|---|---|
| Single candidate, low score | One candidate survives but score < 0.4 | `below-threshold` | `reject-threshold` |

### 4.3 No-candidates (empty candidate set after filtering)

| Scenario | Description | Fallback state | scoringOutcome |
|---|---|---|---|
| No same-kind entity in parent scope | Filtering removes all candidates | `no-candidates` | `reject-no-candidates` |

---

## 5. Coverage map

| Zone | H1-x samples | H2-1 tier | H2-2 fallback state | H2-3 scoringOutcome |
|---|---|---|---|---|
| Allowed (high score) | N1, N2, N3, N5, N6 | `accept` | n/a | `accept` |
| Allowed (medium score) | N4 (same-parent) | `review` | n/a | `accept-review` |
| Allowed (low score) → fallback | Single-candidate, weak signal | `reject` | `below-threshold` | `reject-threshold` |
| Forbidden | FZ-01–06, P1–P5 | n/a (no scoring) | n/a | `skipped` |
| Must-fallback (ambiguous) | MC-01, MC-02, MC-03 | n/a | `ambiguous` | `reject-ambiguous` |
| Must-fallback (no candidates) | Empty-candidate edge cases | n/a | `no-candidates` | `reject-no-candidates` |

**Deterministic results** (`scoringOutcome: 'skipped'`) are events resolved by
explicit-id or fallback-key before scoring runs.  They do not appear in the
allowed/forbidden/must-fallback taxonomy — they are handled upstream.

---

## 6. What this document does NOT define

- Numeric scoring thresholds (H2-1 §2/5)
- Tie-break prohibition implementation details (H2-2)
- Reviewer trace rendering (H2-3)
- Fixture layout and snapshot format (J2-1 / J3-1)
