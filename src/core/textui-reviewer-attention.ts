import type { DiffReviewImpact, DiffSummarySeverity } from './textui-diff-review-impact';
import type { DiffEventTrace } from './textui-diff-diagnostics';

export type ReviewerAttentionLevel =
  | 'critical'
  | 'review-required'
  | 'fallback-applied'
  | 'heuristic-rejected'
  | 'none';

const SEVERITY_RANK: Record<DiffSummarySeverity, number> = {
  's0-minor': 0,
  's1-notice': 1,
  's2-review': 2,
  's3-critical': 3,
};

function isSeverityAtLeast(
  actual: DiffSummarySeverity,
  minimum: DiffSummarySeverity
): boolean {
  return SEVERITY_RANK[actual] >= SEVERITY_RANK[minimum];
}

export function classifyReviewerAttention(
  impact: DiffReviewImpact,
  trace: DiffEventTrace
): ReviewerAttentionLevel {
  if (impact.ambiguityMarker) {
    return 'critical';
  }

  if (impact.heuristicDerived && isSeverityAtLeast(impact.severity, 's2-review')) {
    return 'review-required';
  }

  if (trace.fallbackMarker !== 'none') {
    return 'fallback-applied';
  }

  if (trace.pairingClass === 'heuristic' && trace.heuristicTrace?.rejectedBy != null) {
    return 'heuristic-rejected';
  }

  return 'none';
}
