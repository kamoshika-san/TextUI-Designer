# Diff Regression Snapshot and Assertion Contract (J2-1 / J2-2)

Updated: 2026-03-30
Owner: Maintainer
Related tickets: `T-20260328-202` (J2-1), `T-20260328-203` (J2-2)

## Purpose

This document defines the normalized payload snapshot contract (J2-1) and the
preservation metadata assertion contract (J2-2) for the diff regression harness.
Together they form the assertion vocabulary that regression fixtures use across
positive cases, negative controls, and compare workflow tests.

It specifies:
- which fields in a diff payload are snapshot-stable vs snapshot-volatile (J2-1)
- the minimum snapshot contract shared by all test categories (J2-1)
- the assertion shape for sourceRef, explicitness, ownership, and canonicalization markers (J2-2)
- the boundary between debug trace and reviewer-facing evidence in assertions (J2-2)

It does not specify:
- test fixture file layout or CI lane structure (J3-1)
- snapshot update policy or failure triage procedure (J3-2)
- the test runner or helper boundary (J2-3)
- how heuristic scoring produces trace values (H2-1 / H2-3)
- the external artifact baseline format (E3-2)

---

## Part 1 — Normalized Payload Snapshot Contract (J2-1)

### 1.1 Snapshot scope definition

A **regression snapshot** is a persisted JSON record of selected fields from a
`DiffResultExternal` payload (E1-2).  The snapshot must capture enough structure
to detect regressions without being so wide that routine non-breaking changes
cause spurious failures.

A snapshot has two layers:

| Layer | Contents | Comparison method |
|---|---|---|
| **Structural** | Event list shape: eventKind, entityId, pairingClass, fallbackMarker | Exact match |
| **Metadata** | Preservation metadata fields (section 1.3) | Normalized match (section 1.4) |

The two layers are compared independently.  A structural failure blocks the
assertion immediately; a metadata failure is reported separately.

### 1.2 Stable vs volatile fields

**Stable fields** — included in snapshots, subject to regression assertion:

| Field | Source | Layer |
|---|---|---|
| `eventKind` | `DiffEvent` | Structural |
| `entityId` | `DiffEvent` | Structural |
| `pairingClass` | `DiffEventTrace` | Structural |
| `fallbackMarker` | `DiffEvent` | Structural |
| `sourceRef` | `DiffEvent` | Metadata |
| `explicitness` | `DiffEvent` | Metadata |
| `ownershipScope` | `DiffEvent` | Metadata |
| `canonicalizationMarker` | `DiffEvent` | Metadata |
| `reasonSummary` | `DiffEventTrace` | Metadata |
| `scoringOutcome` | `DiffHeuristicTrace` | Metadata |

**Volatile fields** — excluded from snapshots, must not be asserted:

| Field | Reason for exclusion |
|---|---|
| `activeSignals[]` | May vary with threshold tuning (H2-3 §6) |
| `topScore` / `secondScore` | Floating-point; threshold-dependent |
| `decisionReason` | Free-text; changes with phrasing updates |
| `traversalOrder` | Stripped from `DiffResultExternal` (E1-3) |
| `children[]` | Stripped from `DiffResultExternal` (E1-3) |
| Timestamp / run metadata | Non-deterministic |

### 1.3 Minimum snapshot contract

The minimum snapshot is the set of fields that every test category must assert.
All three test categories (positive case, negative control, compare workflow)
use the same minimum snapshot format.

```ts
interface DiffRegressionSnapshot {
  /** Snapshot format version. Increment only on breaking snapshot shape change. */
  snapshotVersion: number;
  /** Identifier of the fixture that produced this snapshot. */
  fixtureId: string;
  /** Structural layer: ordered list of events. */
  events: DiffRegressionEventRecord[];
}

interface DiffRegressionEventRecord {
  // Structural layer
  eventKind: string;
  entityId: string;
  pairingClass: string;
  fallbackMarker: string;
  // Metadata layer (optional — present only when assertion is needed for this event)
  metadata?: DiffRegressionMetadataRecord;
}
```

`metadata` is present on an event record only when the fixture declares that
metadata assertions are required for that event.  When absent, only the
structural layer is asserted for that event.

### 1.4 Normalization rules for metadata comparison

Metadata comparison uses **normalized match**, not exact match.

Normalization rules:

1. **String whitespace**: Leading/trailing whitespace is stripped.  Internal
   whitespace sequences are collapsed to a single space.
2. **Array ordering**: Arrays of strings (e.g. signal names) are sorted
   lexicographically before comparison.
3. **Null vs absent**: A field that is `null` and a field that is absent (`undefined`)
   are treated as equivalent.
4. **`reasonSummary` prefix**: Only the prefix before the first `(` is compared.
   This captures the category (`heuristic:accept`, `fallback:ambiguous`, etc.)
   without locking in the parenthetical detail.

These rules apply only to the metadata layer.  The structural layer always uses
exact match.

### 1.5 Connection to E2-2 required fields

The minimum snapshot contract must include all fields that E2-2 declares as
required for the artifact output.  The snapshot must not omit any E2-2
required field from the structural layer.

---

## Part 2 — Metadata Assertion Contract (J2-2)

### 2.1 Assertion vocabulary

The following assertion names are the canonical vocabulary for metadata
assertions in regression fixtures.  Using these names keeps fixture intent
readable without coupling to specific field values.

| Assertion name | Meaning | Fields checked |
|---|---|---|
| `assertSourceRef(expected)` | The event carries the expected source reference | `sourceRef` |
| `assertExplicit()` | The event was explicitly declared, not inferred | `explicitness === 'explicit'` |
| `assertAbsent()` | The event represents an absent/removed entity | `explicitness === 'absent'` |
| `assertOwnership(scope)` | The event's ownership scope matches | `ownershipScope` |
| `assertCanonical()` | The event carries a canonicalization marker | `canonicalizationMarker !== null` |
| `assertCanonicalValue(marker)` | The event's canonicalization marker is a specific value | `canonicalizationMarker === marker` |
| `assertReasonCategory(prefix)` | The `reasonSummary` starts with the expected prefix | `reasonSummary.startsWith(prefix)` |
| `assertScoringOutcome(outcome)` | The heuristic scoring outcome is as expected | `scoringOutcome === outcome` |

### 2.2 Stable vs normalized assertions

| Assertion | Stability | Usage rule |
|---|---|---|
| `assertScoringOutcome` | Stable — exact match | Use for all heuristic rescue regression fixtures |
| `assertReasonCategory` | Normalized — prefix only | Use instead of full `reasonSummary` match |
| `assertSourceRef` | Stable — exact match | Use when fixture controls input file paths |
| `assertExplicit` / `assertAbsent` | Stable — enum value | Use for explicitness assertions |
| `assertOwnership` | Stable — exact match | Use when ownership scope is fully determined by fixture |
| `assertCanonical` / `assertCanonicalValue` | Stable / exact | Use `assertCanonical` when only presence matters |

`assertScoringOutcome` is stable because `scoringOutcome` is a stable snapshot
field (H2-3 §6).  Do not assert `activeSignals[]` with exact match — use a
normalized comparison or check only that the slice is non-empty.

### 2.3 Debug trace vs reviewer-facing evidence boundary

**Debug trace fields** are internal diagnostic values.  They must not be used
as regression assertions because they may change without a contract violation:

- `topScore`, `secondScore`, `candidateCount`
- `decisionReason` (full text)
- `activeSignals[]` individual values

**Reviewer-facing evidence fields** are stable enough for regression assertions:

- `scoringOutcome` (stable enum — H2-3)
- `fallbackMarker` (stable enum — E1-2)
- `pairingClass` (stable — C3-2)
- `reasonSummary` prefix (normalized)

The rule: if a field appears in the reviewer-facing concise explanation template
(H2-3 §3), it is evidence-grade and may be asserted.  If it appears only in the
operator detailed trace (H2-3 §4), it is debug-trace-only and must not be
asserted in production regression fixtures.

### 2.4 Assertion use by test category

| Test category | Structural layer | Metadata layer |
|---|---|---|
| Positive case (P1–P5, H1-1) | Required | `assertScoringOutcome('skipped')` for deterministic; outcome for heuristic |
| Negative control (N1–N6, H1-3) | Required | `assertScoringOutcome('reject-*')` or `assertAbsent()` as appropriate |
| Heuristic rescue accepted | Required | `assertScoringOutcome('accept'` or `'accept-review')` |
| Heuristic rescue declined | Required | `assertScoringOutcome('reject-threshold'` or `'reject-ambiguous'` or `'reject-no-candidates')` |
| Compare workflow (WB-H1/D1/D2/D3) | Required | Minimum metadata; full assertion optional |

For compare workflow tests, the metadata layer is optional because the workflow
baseline (G3-2) focuses on event shape and result state rather than deep
metadata provenance.

---

## 3. Alignment with related contracts

| Contract | Connection |
|---|---|
| E2-2 artifact output | Minimum snapshot stable fields must cover all E2-2 required fields |
| E3-2 artifact baseline | Drift detection uses the same normalization rules (section 1.4) |
| D3-3 summary baseline | Parallel baseline layer; does not overlap snapshot vocabulary |
| H2-3 trace surface | `scoringOutcome` stable field — direct use in `assertScoringOutcome` |
| C3-3 golden regression | Existing Mocha + `require('out/')` pattern; snapshot contract extends it |

---

## 4. What this document does NOT define

- Snapshot file naming or directory layout (J3-1)
- How to update snapshots when a contract change is intentional (J3-2)
- The test runner helper boundary and CI lane separation (J2-3)
- Numeric threshold values that affect heuristic scoring outcomes (H3-3)
