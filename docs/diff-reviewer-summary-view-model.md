# Diff Reviewer Summary View-Model (D3-1)

Updated: 2026-03-29
Owner: Maintainer
Related ticket: `T-20260328-166`

## Purpose

This document defines the reviewer-facing summary view-model that bridges the
D2-3 narrative output (`DiffNarrativeResult`) and downstream presentation layers
(terminal output, PR comments, IDE panels).

It specifies:
- how D2-3 narrative data maps into a presenter-friendly model
- what grouping, severity, and evidence jumpback slots look like
- what the view-model's responsibility boundary is relative to G1-2

It does not specify:
- rendering logic (markdown templates, ANSI color codes, HTML)
- PR comment format (D3-2)
- regression baselines (D3-3)
- how G1-2 `DiffReviewerViewModel` is assembled from this model

---

## 1. Position in the pipeline

```
DiffReviewImpact[]               ← D2-1 classification
        ↓
DiffReviewImpact[] (refined)     ← D2-2 rule application
        ↓
DiffNarrativeResult              ← D2-3 narrative assembly + grouping
        ↓
DiffReviewerSummaryViewModel     ← D3-1 (this document) — presenter input
        ↓
Terminal / PR comment / IDE      ← D3-2 / renderer layers
```

The D3-1 view-model is a **read-only projection** of `DiffNarrativeResult`.
It does not re-classify events or modify severity.

---

## 2. DiffReviewerSummaryViewModel

Top-level view-model returned by the D3-1 adapter.

```ts
interface DiffReviewerSummaryViewModel {
  kind: 'diff-reviewer-summary-view-model';
  /** Groups in canonical axis order (from D2-3, preserved). */
  groups: DiffReviewerSummaryGroup[];
  /** Attention banner shown when critical or ambiguity items exist. */
  attentionBanner: DiffReviewerAttentionBanner | null;
  metadata: {
    totalGroups: number;
    totalItems: number;
    highestSeverity: DiffSummarySeverity | null;
    containsAmbiguity: boolean;
    containsHeuristic: boolean;
  };
}
```

**attentionBanner** is non-null when `highestSeverity === 's3-critical'` or
`containsAmbiguity === true`.  It surfaces the most urgent findings at the top of
any presentation without requiring the consumer to scan all groups.

---

## 3. DiffReviewerSummaryGroup

One group corresponding to one `DiffNarrativeGroup`.

```ts
interface DiffReviewerSummaryGroup {
  axis: DiffSummaryImpactAxis;
  highestSeverity: DiffSummarySeverity;
  /** Narrative paragraph from D2-3 (passed through unchanged). */
  narrativeParagraph: string;
  items: DiffReviewerSummaryItem[];
}
```

The `narrativeParagraph` is the D2-3 `DiffNarrativeGroup.narrative` string.
The view-model passes it through without modification.  Renderers apply
their own formatting.

---

## 4. DiffReviewerSummaryItem

One item within a group.  Corresponds to one `DiffNarrativeItem`.

```ts
interface DiffReviewerSummaryItem {
  /** Source event id for traceability. */
  eventId: string;
  severity: DiffSummarySeverity;
  /** Human-readable one-line description (from D2-3 labelFromSummaryKey). */
  label: string;
  /** Jumpback slot for evidence navigation (from G1-3 navigation contract). */
  evidenceJump: DiffReviewerEvidenceJump | null;
  /** Whether classification is heuristic-derived (surface as uncertainty hint). */
  heuristicDerived: boolean;
  /** Whether this item is an ambiguity/conservative-fallback finding. */
  ambiguityMarker: boolean;
  /**
   * Rule trace for developer/diagnostic surfaces.
   * Renderers should fold this behind an expand control; do not show inline.
   */
  ruleTrace: string;
}
```

---

## 5. DiffReviewerEvidenceJump

Navigation slot following the G1-3 contract.

```ts
interface DiffReviewerEvidenceJump {
  /**
   * Full jump: '<documentPath>#<entityPath>'.
   * Partial jump (no documentPath): '<entityPath>' only.
   * null when no evidence path is available.
   */
  jumpTarget: string | null;
  /** Side of the comparison this jump points to ('previous' | 'next'). */
  side: 'previous' | 'next';
}
```

`evidenceJump` is null when neither `documentPath` nor `entityPath` is available
for this item (silent omission per G1-3 degraded behavior contract).

For events with both previous and next sides, the view-model uses the `next` side
as the primary jump target.  Renderers may expose both if needed.

---

## 6. DiffReviewerAttentionBanner

```ts
interface DiffReviewerAttentionBanner {
  /** Severity level that triggered the banner. */
  triggerSeverity: DiffSummarySeverity;
  /** True when the trigger was an ambiguity / conservative fallback. */
  isAmbiguity: boolean;
  /** Number of s3-critical items. */
  criticalCount: number;
  /** Number of ambiguity-axis items. */
  ambiguityCount: number;
}
```

---

## 7. Responsibility boundary vs G1-2

| Concern | Owner |
|---|---|
| Event classification, severity, impactAxis | D2-1 |
| Hook-based rule refinement | D2-2 |
| Grouping order, narrative paragraph | D2-3 |
| evidenceJump navigation contract | G1-3 |
| Summary view-model shape (this doc) | D3-1 |
| Reviewer full view-model (DiffReviewerViewModel) | G1-2 |
| Rendering markdown / terminal | D3-2 / renderer |

D3-1 does not re-implement G1-2.  G1-2 consumes `DiffReviewerGroup` from D2-3
directly.  D3-1 provides a **separate** presenter-facing model optimized for
rendering.  A future integration layer may merge these or treat them as
alternative consumers of the same D2-3 output.

---

## 8. Mapping from DiffNarrativeResult

```
DiffNarrativeResult.groups[i]          → DiffReviewerSummaryGroup
  .axis                                → .axis
  .highestSeverity                     → .highestSeverity
  .narrative                           → .narrativeParagraph
  .items[j]                            → DiffReviewerSummaryItem
    .eventId                           → .eventId
    .severity                          → .severity
    .label                             → .label
    .heuristicDerived                  → .heuristicDerived
    .ambiguityMarker                   → .ambiguityMarker
    .ruleTrace                         → .ruleTrace
    (evidence from DiffEvent.trace)    → .evidenceJump (via G1-3 contract)
```

---

## 9. What this document does NOT define

- How `evidenceJump.jumpTarget` is resolved to an IDE-navigable URI
- Rendering format (terminal ANSI, markdown, HTML)
- Diff between D3-1 summary view-model and G1-2 reviewer view-model at implementation time
- D3-2 PR comment layout
