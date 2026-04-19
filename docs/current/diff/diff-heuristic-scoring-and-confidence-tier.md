# Diff Heuristic Scoring and Confidence Tier (H2-1)

Updated: 2026-03-30
Owner: Maintainer
Related ticket: `T-20260328-215`

## Purpose

This document defines the similarity score band and confidence tier system for
heuristic rescue operations.  It specifies how signals are weighted, which tiers
map to which outcomes, and where the boundary sits between "rescue allowed" and
"fall back to remove+add".

It specifies:
- the score band definition (numeric ranges → tier labels)
- the three confidence tiers and their outcomes
- the mandatory execution order (deterministic first, scoring last)
- the responsibility boundary between scoring and runtime threshold tuning

It does not specify:
- which specific signals contribute to scoring (H1-2 signal inventory)
- how tie-break is handled when two candidates score equally (H2-2)
- the reviewer-facing trace surface for heuristic results (H2-3)
- actual numeric threshold values (runtime configuration, not design doc)

---

## 1. Execution order invariant

Similarity scoring must only run **after** all deterministic filters have been
applied.  The mandatory order is:

```
1. Deterministic identity (explicit-id, fallback-key)
2. Forbidden-zone filter (cross-screen, cross-parent, kind-change, display-text-only)
3. Candidate set reduction (same-parent, same-kind, bounded scope filter)
4. [Similarity scoring runs here — only on remaining candidates]
5. Tie-break check (H2-2) — if ≥2 candidates remain after scoring
6. Outcome: rescue / ambiguity-fallback / remove+add
```

Steps 1–3 are pre-conditions.  If any pre-condition eliminates all candidates,
scoring never runs.

---

## 2. Score band definition

Similarity scoring produces a scalar score in the range [0, 1] by aggregating
supportive signals from the H1-2 inventory.

The score is divided into three bands:

| Band | Score range | Label | Meaning |
|---|---|---|---|
| High | ≥ 0.7 | `high` | Strong signal alignment — rescue likely valid |
| Medium | 0.4 – 0.69 | `medium` | Partial signal alignment — rescue needs review |
| Low | < 0.4 | `low` | Weak signal alignment — conservative fallback |

These boundary values (`0.7`, `0.4`) are **design placeholders**.  The runtime
threshold configuration may shift them based on empirical tuning.  The band
names and tier mapping (section 3) are stable; the threshold values are not.

---

## 3. Confidence tier definition

The score band maps to one of three confidence tiers, which determine the
outcome:

| Tier | Score band | `DiffFallbackConfidence` | Outcome |
|---|---|---|---|
| `accept` | High | `'high'` | Heuristic rescue applied. Emit `update`/`rename` event with `fallbackMarker: 'heuristic-pending'` |
| `review` | Medium | `'high'` | Heuristic rescue applied, but reviewer attention required. Same emission as `accept`, but with ambiguity annotation in trace |
| `reject` | Low | `'not-applicable'` | No rescue. Fall back to `remove+add` with `fallbackMarker: 'remove-add-fallback'` |

**Notes:**

- `DiffFallbackConfidence` uses the existing two-value type (`'high'` \| `'not-applicable'`).
  Both `accept` and `review` tiers map to `'high'` because the match is claimed —
  the distinction between them is carried in the trace (H2-3), not in the
  confidence value.
- The `review` tier should produce a trace entry marking it as heuristic with
  medium confidence so the reviewer surface can surface it distinctly.

---

## 4. Single-candidate vs multi-candidate

### 4.1 Single candidate after filtering

| Candidate score | Tier | Outcome |
|---|---|---|
| ≥ 0.7 | `accept` | Rescue |
| 0.4 – 0.69 | `review` | Rescue with annotation |
| < 0.4 | `reject` | `remove+add` |

### 4.2 Multiple candidates after filtering

When ≥2 candidates survive bounded filtering, scoring is attempted on each:

- If the top-scoring candidate has a score ≥ 0.7 **and** the second-highest
  candidate's score is ≤ 0.5 (gap ≥ 0.2): the top candidate may proceed to
  `accept` tier (unambiguous winner).
- Otherwise: tie-break prohibition applies (H2-2) → all candidates fall back.

The gap threshold (0.2) is a design placeholder subject to runtime tuning.

---

## 5. Threshold ownership boundary

The scoring boundaries in section 2 are **design-time defaults**, not
implementation constants.  The following must be true:

1. Threshold values (0.7, 0.4, 0.2) must live in a runtime-readable
   configuration object, not in scoring logic as hard-coded literals.
2. The score band labels (`'high'`, `'medium'`, `'low'`) and tier names
   (`'accept'`, `'review'`, `'reject'`) are stable code-facing constants.
3. Changes to threshold values must not require code changes — only
   configuration updates.
4. Threshold tuning is **not** a design document responsibility.

This separation ensures that the scoring algorithm can be calibrated in
production without a code deploy.

---

## 6. Alignment with existing types

| Concept | Type | Value |
|---|---|---|
| Rescue claimed (accept/review) | `DiffFallbackMarker` | `'heuristic-pending'` |
| No rescue (reject) | `DiffFallbackMarker` | `'remove-add-fallback'` |
| Deterministic result | `DiffFallbackMarker` | `'none'` |
| Rescue claimed confidence | `DiffFallbackConfidence` | `'high'` |
| No rescue confidence | `DiffFallbackConfidence` | `'not-applicable'` |

The scoring system does not introduce new type values.

---

## 7. What this document does NOT define

- Signal scoring formula (how individual signals contribute weight) — H2 implementation
- Tie-break prohibition details (H2-2)
- Reviewer audit surface for heuristic results (H2-3)
- Numeric threshold tuning procedure (H3-3)
- Threshold configuration key names (G3-1 / H3 implementation)
