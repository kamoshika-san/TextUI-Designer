/**
 * buildDiffPRCommentPayload: assemble a structured PR comment payload.
 *
 * Purpose (T-20260401-005, Epic L Sprint L2):
 *   Combine DiffResultExternal (D1), review impact (D2-1), refined impact (D2-2),
 *   and narrative (D2-3) into a DiffPRCommentPayload that the rendering layer
 *   (L2-3) can consume without any re-judgment.
 *
 * Design rules:
 *   - Narrative is passed through verbatim. Never re-interpret assembleSummaryNarrative output.
 *   - header.signal comes from DiffCheckRunResult (T-004 output), not re-computed here.
 *   - findings lists all events from DiffResultExternal in stable order.
 *   - highlights selects the top N findings by severity for the compact view.
 *   - links is optional; omitted when not provided.
 */

import type { DiffResultExternal, DiffExternalEvent } from '../../../core/textui-diff-result-external';
import type { DiffCheckSignal } from '../gate/build-diff-check-run-result';

// -- Dependency types (D2-1 / D2-2 / D2-3 shapes from core) -----------------

import type { DiffReviewImpactResult, DiffSummarySeverity } from '../../../core/textui-diff-review-impact';
import type { DiffNarrativeResult } from '../../../core/textui-diff-summary-narrative';
import type { SemanticSummaryResult } from '../../../core/textui-semantic-diff-summary';

// Re-export D2 types for single-import convenience
export type { DiffReviewImpactResult, DiffNarrativeResult };
export type { SemanticSummaryResult };

// -- Output types ------------------------------------------------------------

export interface DiffPRCommentFinding {
  /** Stable event identifier from DiffResultExternal. */
  eventId: string;
  /** Event kind (add/remove/update/etc.) */
  kind: string;
  /** Entity kind (page/component/property). */
  entityKind: string;
  /** Severity derived from review impact classification. */
  severity: DiffSummarySeverity;
  /** Human-readable description from the narrative label. */
  description: string;
}

export interface DiffPRCommentHeader {
  /** CI gate signal from DiffCheckRunResult (T-004). */
  signal: DiffCheckSignal;
  /** Total number of diff events. */
  totalEvents: number;
  /** Number of critical events. */
  criticalCount: number;
  /** Highest severity across all findings, or null if no findings. */
  highestSeverity: DiffSummarySeverity | null;
}

export interface DiffPRCommentLink {
  /** Display label for the link. */
  label: string;
  /** URL or artifact path. */
  href: string;
}

export interface DiffPRCommentPayload {
  kind: 'diff-pr-comment-payload';
  /** Summary header with signal and counts. */
  header: DiffPRCommentHeader;
  /**
   * Top N findings by severity for compact display.
   * Ordered by severity descending, then by eventId for determinism.
   */
  highlights: DiffPRCommentFinding[];
  /** Full ordered finding list. */
  findings: DiffPRCommentFinding[];
  /**
   * Narrative groups from D2-3 (assembleSummaryNarrative output), passed
   * through verbatim. Rendering layer uses this for full-mode output.
   */
  narrative: DiffNarrativeResult;
  /**
   * D4 semantic one-line summaries.
   * When present, the rendering layer displays a scannable change list
   * before the detailed findings table. Optional for backward compatibility.
   */
  semanticSummary?: SemanticSummaryResult;
  /** Optional evidence links (artifact URLs, CI run links, etc.). */
  links?: DiffPRCommentLink[];
}

// -- Options -----------------------------------------------------------------

export interface BuildDiffPRCommentPayloadOpts {
  /** D1: validated external diff result. */
  external: DiffResultExternal;
  /** D2-1: review impact classification result. */
  reviewImpact: DiffReviewImpactResult;
  /**
   * D2-2: refined impact result. May be the same as reviewImpact if no
   * D2-2 rules were applied. Findings are sourced from this, not reviewImpact.
   */
  refinedImpact: DiffReviewImpactResult;
  /** D2-3: narrative assembly output — passed through verbatim. */
  narrative: DiffNarrativeResult;
  /** CI gate signal from T-004 DiffCheckRunResult. */
  signal: DiffCheckSignal;
  /** Number of highlights to include (default: 5). */
  highlightCount?: number;
  /** Optional evidence links. */
  links?: DiffPRCommentLink[];
  /**
   * D4: semantic one-line summaries. Optional.
   * When provided, included in the payload for the rendering layer.
   */
  semanticSummary?: SemanticSummaryResult;
}

// -- Internal helpers --------------------------------------------------------

const SEVERITY_RANK: Record<DiffSummarySeverity, number> = {
  's3-critical': 3,
  's2-review': 2,
  's1-notice': 1,
  's0-minor': 0,
};

function buildFindings(
  events: DiffExternalEvent[],
  refinedImpact: DiffReviewImpactResult
): DiffPRCommentFinding[] {
  // Build a lookup from eventId → impact for description/severity
  const impactMap = new Map(refinedImpact.impacts.map(i => [i.eventId, i]));

  // Preserve event order from DiffResultExternal (deterministic)
  return events.map(event => {
    const impact = impactMap.get(event.eventId);
    const severity: DiffSummarySeverity = impact?.severity ?? 's0-minor';
    // Description: use ruleTrace as a stable fallback when no narrative label is set
    const description = impact?.ruleTrace ?? `${event.kind} ${event.entityKind}`;

    return {
      eventId: event.eventId,
      kind: event.kind,
      entityKind: event.entityKind,
      severity,
      description,
    };
  });
}

function buildHighlights(
  findings: DiffPRCommentFinding[],
  count: number
): DiffPRCommentFinding[] {
  // Sort by severity descending, then eventId ascending for full determinism
  const sorted = [...findings].sort((a, b) => {
    const rankDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (rankDiff !== 0) { return rankDiff; }
    return a.eventId.localeCompare(b.eventId);
  });
  return sorted.slice(0, count);
}

function countCritical(findings: DiffPRCommentFinding[]): number {
  return findings.filter(f => f.severity === 's3-critical').length;
}

// -- Public API --------------------------------------------------------------

/**
 * Assemble a DiffPRCommentPayload from D1/D2-1/D2-2/D2-3 outputs.
 *
 * The narrative is passed through verbatim — this function never re-interprets
 * or re-classifies assembleSummaryNarrative output. The rendering layer (L2-3)
 * is the only consumer of this payload and must not perform re-judgment either.
 *
 * @param opts  Combined D1/D2/gate inputs and display options.
 * @returns     A DiffPRCommentPayload ready for renderDiffPRComment().
 */
export function buildDiffPRCommentPayload(
  opts: BuildDiffPRCommentPayloadOpts
): DiffPRCommentPayload {
  const {
    external,
    refinedImpact,
    narrative,
    signal,
    highlightCount = 5,
    links,
    semanticSummary,
  } = opts;

  const findings = buildFindings(external.events, refinedImpact);
  const highlights = buildHighlights(findings, highlightCount);

  const header: DiffPRCommentHeader = {
    signal,
    totalEvents: external.metadata.eventCount,
    criticalCount: countCritical(findings),
    highestSeverity: refinedImpact.metadata.highestSeverity,
  };

  const payload: DiffPRCommentPayload = {
    kind: 'diff-pr-comment-payload',
    header,
    highlights,
    findings,
    narrative,
  };

  if (semanticSummary !== undefined) {
    payload.semanticSummary = semanticSummary;
  }

  if (links !== undefined) {
    payload.links = links;
  }

  return payload;
}
