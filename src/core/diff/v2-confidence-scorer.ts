import type { V2DiffDecision, V2DiffEvent } from './diff-v2-types';
import { AMBIGUITY_THRESHOLD } from './diff-v2-types';

/**
 * Factory that builds a correctly-typed V2DiffDecision from a confidence score.
 * Determines confidence_band automatically against AMBIGUITY_THRESHOLD.
 */
export function buildV2Decision(
  event: V2DiffEvent,
  targetId: string,
  confidence: number,
  ambiguityReason?: string
): V2DiffDecision {
  if (confidence >= AMBIGUITY_THRESHOLD) {
    return {
      confidence_band: 'high',
      diff_event: event,
      target_id: targetId,
      confidence,
      ambiguity_reason: ambiguityReason,
    };
  }
  return {
    confidence_band: 'low',
    diff_event: event,
    target_id: targetId,
    confidence,
    ambiguity_reason: ambiguityReason ?? 'low confidence',
    review_status: 'needs_review',
  };
}
