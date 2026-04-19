# Diff Heuristic Trace and Reviewer Audit Surface (H2-3)

Updated: 2026-03-30
Owner: Maintainer
Related ticket: `T-20260328-217`

## Purpose

This document defines the heuristic rescue trace shape and the reviewer audit
surface that exposes it.  It specifies what trace data is captured per rescue
decision, how it is separated from the deterministic trace, and what the
reviewer surface shows vs what is kept for operator diagnostics.

It specifies:
- the `DiffHeuristicTrace` shape (internal, per-event)
- the reviewer-facing concise explanation
- the operator-facing detailed trace
- the relationship to existing `DiffEventTrace` (C3-2)
- the Epic G/J connection points

It does not specify:
- score band thresholds (H2-1)
- tie-break prohibition rules (H2-2)
- how the reviewer explanation is rendered in markdown (D3-2)
- runtime threshold configuration (H3-3)

---

## 1. DiffHeuristicTrace

Internal per-event trace for heuristic rescue operations.

```ts
interface DiffHeuristicTrace {
  /** Whether heuristic scoring was attempted for this event. */
  scoringAttempted: boolean;
  /** Outcome of the scoring phase. */
  scoringOutcome: DiffHeuristicScoringOutcome;
  /** Score of the top-scoring candidate (null when no scoring occurred). */
  topScore: number | null;
  /** Score of the second-highest candidate, if it existed. */
  secondScore: number | null;
  /** Number of candidates evaluated after bounded filtering. */
  candidateCount: number;
  /** Signals that contributed positively to the top candidate's score. */
  activeSignals: DiffHeuristicSignalName[];
  /** Fallback state when rescue was declined. */
  fallbackState: DiffHeuristicFallbackState | null;
  /** One-sentence human-readable reason for the rescue decision. */
  decisionReason: string;
}

type DiffHeuristicScoringOutcome =
  | 'accept'          // Rescue applied (score ≥ accept threshold)
  | 'accept-review'   // Rescue applied with reviewer attention annotation
  | 'reject-threshold' // Single candidate below threshold
  | 'reject-ambiguous' // Multiple candidates; tie-break prohibited
  | 'reject-no-candidates' // No candidates after filtering
  | 'skipped';        // Deterministic result; scoring not needed

type DiffHeuristicFallbackState =
  | 'ambiguous'
  | 'below-threshold'
  | 'no-candidates';

type DiffHeuristicSignalName =
  | 'canonical-kind'
  | 'owner-scope'
  | 'property-shape'
  | 'slot-placement'
  | 'event-anchor'
  | 'fallback-key-match';
```

---

## 2. Relationship to DiffEventTrace (C3-2)

`DiffHeuristicTrace` is a **sibling extension** of `DiffEventTrace`, not a
replacement.  It carries heuristic-specific scoring detail that the general
trace (pairingClass, pairingReason, fallbackMarker) does not need to expose.

| Field | Source | Present on |
|---|---|---|
| `pairingClass` | `DiffEventTrace` | All events |
| `pairingReason` | `DiffEventTrace` | All events |
| `fallbackMarker` | `DiffEventTrace` | All events |
| `reasonSummary` | `DiffEventTrace` | All events |
| `scoringAttempted` | `DiffHeuristicTrace` | Events where heuristic scoring ran |
| `activeSignals` | `DiffHeuristicTrace` | Events where rescue was accepted |
| `fallbackState` | `DiffHeuristicTrace` | Events where rescue was declined |

`DiffHeuristicTrace` is attached at the event level as an optional field:

```ts
interface DiffEvent {
  // ... existing fields ...
  trace: DiffEventTrace;
  heuristicTrace?: DiffHeuristicTrace;  // Present only when scoringAttempted === true
}
```

---

## 3. Reviewer-facing concise explanation

The reviewer surface (G1-3 navigation, D3-2 PR comment) displays a concise
one-line explanation derived from `DiffHeuristicTrace.decisionReason`.

**Format by outcome:**

| Outcome | Concise explanation template |
|---|---|
| `accept` | `Heuristic match (score: {topScore:.2f}) — {activeSignals joined with ", "}` |
| `accept-review` | `⚠ Heuristic match (score: {topScore:.2f}, review recommended) — {activeSignals}` |
| `reject-threshold` | `No match (score {topScore:.2f} below threshold)` |
| `reject-ambiguous` | `No match ({candidateCount} candidates, ambiguous)` |
| `reject-no-candidates` | `No match (no candidates in scope)` |
| `skipped` | (not shown — deterministic result, no heuristic annotation needed) |

**Key rule**: The concise explanation must never expose raw score threshold
values or signal weight values.  It may mention the score but not the threshold
boundary.

---

## 4. Operator-facing detailed trace

The detailed trace is available in the diagnostics surface (C3-2
`DiffDiagnosticsResult`) and in the optional `diagnostics` extension field of
`DiffResultExternal` (E1-2 policy).

**Detailed trace fields exposed in diagnostics:**

```
scoringOutcome
topScore / secondScore
candidateCount
activeSignals[]
fallbackState (when applicable)
decisionReason (full text)
```

`activeSignals` is particularly useful for operator debugging: it shows which
signals fired and allows tuning decisions (H3-3) to be made with evidence.

The detailed trace must **not** appear in the PR comment renderer (D3-2) or the
check-run result (G2-2).

---

## 5. `reasonSummary` population for heuristic events

`DiffEventTrace.reasonSummary` (C3-2) is populated as follows for heuristic
events:

| Case | `reasonSummary` content |
|---|---|
| Heuristic rescue accepted | `"heuristic:<scoringOutcome>(<activeSignals>)"` |
| Heuristic rescue declined | `"fallback:<fallbackState>(<declineReason short>)"` |
| Deterministic (scoring skipped) | Existing C3-2 format unchanged |

This ensures that `DiffEventTrace.reasonSummary` remains a useful single-line
trace for all event types without requiring consumers to check for
`heuristicTrace` presence.

---

## 6. Epic G/J connection points

| Connection | From | To |
|---|---|---|
| Reviewer explanation | `DiffHeuristicTrace.decisionReason` | G1-3 evidence trace snippet |
| PR comment annotation | `accept-review` outcome | D3-1/D3-2 `heuristicDerived: true` |
| Diagnostics surface | Full `DiffHeuristicTrace` | C3-2 `DiffDiagnosticsResult` |
| Regression assertion | `scoringOutcome` + `activeSignals` | J2-2 metadata assertion |

For Epic J regression:
- `scoringOutcome` is a stable field suitable for snapshot assertion (section 2.2 stable field).
- `activeSignals[]` may vary with threshold tuning; it is a candidate for
  normalized comparison (not exact match) in J2-1 snapshot contracts.

---

## 7. What this document does NOT define

- The numeric score computation formula (H2 implementation)
- Threshold configuration keys (G3-1 / H3-3)
- How `heuristicTrace` is serialized to JSON (E1-2 + E3-3)
- How the reviewer explanation is rendered in markdown (D3-2)
