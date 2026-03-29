# Diff Heuristic Tie-Break Prohibition and Ambiguity Fallback (H2-2)

Updated: 2026-03-30
Owner: Maintainer
Related ticket: `T-20260328-216`

## Purpose

This document defines the tie-break prohibition rule and the ambiguity fallback
policy for heuristic rescue operations.  It specifies when rescue is declined,
what fallback state is emitted, and what minimal trace information must be
preserved for reviewers.

It specifies:
- the conditions under which tie-breaking is prohibited
- the three fallback states and their meaning
- the conservative fallback contract
- the reviewer-facing explanation minimum

It does not specify:
- the scoring bands or confidence tiers (H2-1)
- the reviewer audit surface trace shape (H2-3)
- how the fallback is rendered in the PR comment (D3-2)

---

## 1. Tie-break prohibition rule

A tie-break is any method of selecting one candidate when ≥2 candidates survive
bounded filtering with scores that do not meet the unambiguous-winner criteria
(H2-1 section 4.2).

**All tie-breaking is prohibited.**

This includes:
- Ordinal selection (pick the first, or the nearest in position)
- Recency selection (pick the most recently added entity)
- Tiebreaker signals (adding a secondary sort key to break equality)
- Score rounding to create an artificial winner

**Rationale**: A false match in a heuristic rescue damages reviewer trust more
than a conservative `remove+add` result.  The cost of one incorrect match that
passes a reviewer is higher than the cost of a miss that appears as `remove+add`.

---

## 2. Hidden deterministic-looking tie-break (prohibited pattern)

A **hidden deterministic-looking tie-break** is a tie-break disguised as a
deterministic rule.  Examples:

- Using position (ordinal) to claim that two elements with equal scores are
  "deterministically matched" when they have no explicit identity
- Using a display text similarity sub-score as a tiebreaker when it was already
  declared a prohibited signal (H1-2 section 2.2)
- Adding a "fallback" secondary scoring pass that re-enables a prohibited signal

These patterns are explicitly banned.  Any scoring logic that would match a
candidate only by a prohibited signal path is invalid regardless of how it is
named.

---

## 3. Fallback state taxonomy

When heuristic rescue is declined, the result enters one of three fallback
states:

| State | Definition | Condition |
|---|---|---|
| `ambiguous` | ≥2 candidates exist; no unambiguous winner | Multiple candidates, gap < minimum (H2-1 §4.2) |
| `below-threshold` | Single candidate exists but score is too low | Single candidate, score in `low` band (< 0.4) |
| `no-candidates` | No surviving candidate after bounded filtering | Candidate set empty after pre-conditions |

All three states produce the same external output: `remove+add` with
`fallbackMarker: 'remove-add-fallback'` and `DiffFallbackConfidence: 'not-applicable'`.

The fallback state is an **internal diagnostic value** only.  It appears in the
trace (H2-3) but never in the external diff contract (E1-2 serialization policy).

---

## 4. Conservative fallback contract

When any fallback state is triggered, the engine must:

1. Emit a `remove+add` event pair for the unmatched entity.
2. Set `fallbackMarker: 'remove-add-fallback'` on both events.
3. Set `DiffFallbackConfidence: 'not-applicable'`.
4. Record the fallback state (`ambiguous` / `below-threshold` / `no-candidates`)
   in the internal trace.
5. Preserve the candidate set size (how many candidates existed) in the trace
   for reviewer audit (H2-3).

The engine must **not**:
- Silently pick one candidate when ambiguity exists.
- Emit a `heuristic-pending` fallbackMarker for a rescue that was declined.
- Suppress the candidate set information from the trace.

---

## 5. Reviewer-facing explanation minimum

When a fallback is triggered, the trace must carry enough information for the
reviewer surface to produce a meaningful explanation.  The minimum required
trace fields for a fallback event are:

| Field | Value | Purpose |
|---|---|---|
| `fallbackState` | `'ambiguous'` \| `'below-threshold'` \| `'no-candidates'` | Categorize why rescue was declined |
| `candidateCount` | integer ≥ 0 | How many candidates existed before decline |
| `topScore` | float \| null | Score of the highest-scoring candidate (null if no candidates) |
| `declineReason` | string | One-sentence human-readable explanation |

**Examples of `declineReason`:**

```
"ambiguous" state:
  "2 candidates with similar scores (0.65, 0.61) — rescue declined to avoid false match"

"below-threshold" state:
  "No candidate exceeded the accept threshold (top score: 0.28)"

"no-candidates" state:
  "No same-kind candidate in parent scope found after filtering"
```

These fields are part of the internal trace and are consumed by H2-3 to
construct the reviewer audit surface.  They must not appear in `DiffResultExternal`.

---

## 6. Alignment with H2-1

H2-1 section 4.2 defines the multi-candidate unambiguous-winner criteria:
- Top score ≥ 0.7 AND gap to second ≥ 0.2 → `accept` tier (rescue).
- Otherwise → tie-break prohibition applies → `ambiguous` fallback state.

This document governs what happens at the "otherwise" branch.

---

## 7. What this document does NOT define

- Score band thresholds (H2-1)
- How `declineReason` is rendered in the reviewer surface (H2-3)
- How `remove+add` fallback events are formatted in PR comments (D3-2)
- How the fallback state appears in diagnostics output (C3-2 / E1-2)
