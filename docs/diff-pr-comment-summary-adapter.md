# Diff PR Comment Summary Adapter (G2-1)

Updated: 2026-03-29
Owner: Maintainer
Related ticket: `T-20260328-189`

## Purpose

This document defines the adapter contract that converts diff result and semantic
summary data into a PR comment payload.  It determines what shape the PR comment
surface receives, how oversized output is truncated, and how evidence links are
carried through.

It specifies:
- the PR comment payload shape (`DiffPRCommentPayload`)
- truncation policy for overlong outputs
- how Epic D summary and Epic E external contract intersect here
- responsibility boundary vs D3-2 (formatting) and E2-3 (export)

It does not specify:
- rendering of the payload into markdown text (D3-2)
- how the payload is posted to a GitHub PR API (G2 integration layer)
- the JSON export artifact format (E2-2)

---

## 1. Position in the pipeline

```
DiffResultExternal           ← E1-3 projection output
DiffNarrativeResult          ← D2-3 narrative assembly
        ↓
buildDiffPRCommentPayload()  ← G2-1 adapter (this document)
        ↓
DiffPRCommentPayload         ← passed to D3-2 formatter / G2 poster
```

The adapter is a **read-only projection**.  It does not re-classify events or
re-assemble narratives.

---

## 2. DiffPRCommentPayload

Top-level PR comment adapter output.

```ts
interface DiffPRCommentPayload {
  kind: 'diff-pr-comment-payload';
  /** Concise summary line for the PR comment header. */
  headline: string;
  /** Severity signal for the PR comment heading badge. */
  headlineSeverity: DiffSummarySeverity | null;
  /** True when the diff contains ambiguity / conservative-fallback findings. */
  containsAmbiguity: boolean;
  /** Grouped findings, ordered by axis (canonical D2-3 order). */
  groups: DiffPRCommentGroup[];
  /** Pagination / truncation state. */
  truncation: DiffPRCommentTruncation;
  /** Traceability back to the source diff result. */
  sourceRef: DiffPRCommentSourceRef;
}
```

---

## 3. DiffPRCommentGroup

One severity/axis group in the PR comment.

```ts
interface DiffPRCommentGroup {
  axis: DiffSummaryImpactAxis;
  highestSeverity: DiffSummarySeverity;
  /** Narrative paragraph from D2-3 (passed through unchanged). */
  narrativeParagraph: string;
  /** Items shown in this group (after truncation applied). */
  items: DiffPRCommentItem[];
  /** Number of items omitted by truncation (0 when none). */
  omittedCount: number;
}
```

---

## 4. DiffPRCommentItem

One finding line within a group.

```ts
interface DiffPRCommentItem {
  eventId: string;
  severity: DiffSummarySeverity;
  label: string;
  /** Evidence jump target (G1-3 contract). Null when not available. */
  evidenceJump: DiffReviewerEvidenceJump | null;
  heuristicDerived: boolean;
  ambiguityMarker: boolean;
}
```

`ruleTrace` is **not included** in the PR comment payload (production surface
exclusion per E1-2 policy).

---

## 5. DiffPRCommentTruncation

```ts
interface DiffPRCommentTruncation {
  /** Whether any items were omitted from the payload. */
  truncated: boolean;
  /** Total number of items across all groups before truncation. */
  totalItems: number;
  /** Number of items included in the payload after truncation. */
  includedItems: number;
  /**
   * Link target for a "view full diff" detail page.
   * Null when no detail link is available.
   */
  detailLink: string | null;
}
```

---

## 6. DiffPRCommentSourceRef

```ts
interface DiffPRCommentSourceRef {
  /** Engine that produced the diff result. */
  engine: string;
  /** Schema version of the source diff result. */
  schemaVersion: string;
  /** Page identifiers from previous and next documents. */
  previousPageId: string;
  nextPageId: string;
}
```

---

## 7. Truncation policy

PR comment outputs have a finite size budget.  The adapter applies truncation
**before** passing to the renderer.

**Rules:**

| Rule | Value |
|---|---|
| Max items per group | 10 |
| Max groups included | All (groups are not truncated; items within groups are) |
| Item priority within group | s3-critical first, then s2-review, then s1-info, then s0-minor |
| Omitted count reporting | `group.omittedCount` records how many items were cut |
| Detail link | Provided by caller via `buildDiffPRCommentPayload()` options |

When `omittedCount > 0`, the renderer (D3-2) is responsible for showing a
"... N more items" line; the adapter only records the count.

**Ambiguity items are never truncated** — items with `ambiguityMarker: true`
are always included regardless of the per-group item cap.

---

## 8. Headline generation

`headline` is a compact one-line summary generated from `DiffNarrativeResult.metadata`:

```
Format: "<N> change(s) — <highestSeverity label> [· <ambiguity note>]"
Examples:
  "9 changes — critical (1 ambiguous)"
  "3 changes — review"
  "1 change — informational"
```

`headlineSeverity` comes directly from `metadata.highestSeverity`.

---

## 9. Responsibility boundary

| Concern | Owner |
|---|---|
| Event classification, severity | D2-1 |
| Summary grouping and narrative | D2-3 |
| Evidence jump navigation | G1-3 |
| Summary view-model shape | D3-1 |
| PR comment payload shape (this doc) | G2-1 |
| PR comment markdown rendering | D3-2 |
| PR surface summary export contract | E2-3 |
| GitHub PR API post | G2 integration (future) |

**Boundary vs D3-2**: G2-1 defines the payload shape (data layer).  D3-2
defines the markdown template (rendering layer).  D3-2 consumes
`DiffPRCommentPayload` as its input.

**Boundary vs E2-3**: E2-3 defines the JSON export artifact for PR surfaces
(machine-readable, stored).  G2-1 defines the live comment payload (ephemeral,
human-readable target).  Both consume `DiffNarrativeResult` but serve different
downstream consumers.

---

## 10. Adapter function signature

```ts
interface DiffPRCommentOptions {
  /** Caller-provided "view full diff" URL. Null if unavailable. */
  detailLink?: string | null;
  /** Override max items per group (default: 10). */
  maxItemsPerGroup?: number;
}

function buildDiffPRCommentPayload(
  narrativeResult: DiffNarrativeResult,
  externalResult: DiffResultExternal,
  options?: DiffPRCommentOptions
): DiffPRCommentPayload
```

The function never accesses `DiffCompareResult` directly.  All inputs are
already projected through their respective Epic D / Epic E boundaries.

---

## 11. What this document does NOT define

- How `DiffPRCommentPayload` is rendered to markdown (D3-2)
- GitHub API call structure or authentication (G2 integration layer)
- How `detailLink` is computed or resolved (caller responsibility)
- Retry / rate-limit behavior when posting (G2 integration layer)
