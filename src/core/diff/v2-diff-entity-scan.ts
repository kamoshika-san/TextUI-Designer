import type { DiffCompareDocument } from './diff-types';
import type {
  V2ScreenDiff,
  V2ScreenDiffInScope,
  V2DiffRecord,
  V2HighConfidenceDecision,
} from './diff-v2-types';

function makeEntityRecord(
  event: 'entity_added' | 'entity_removed',
  targetId: string
): V2DiffRecord {
  const decision: V2HighConfidenceDecision = {
    confidence_band: 'high',
    diff_event: event,
    target_id: targetId,
    confidence: 1.0,
  };
  return { decision, explanation: { evidence: [] } };
}

/**
 * Pure function: detects entity_added / entity_removed between two versions of the
 * same screen. Comparison is index-based (count delta); pairing refinement is a
 * future sprint.
 */
export function scanEntityDiffs(
  previous: DiffCompareDocument,
  next: DiffCompareDocument
): V2ScreenDiff[] {
  const screenId = previous.page.id;
  const prevCount = previous.normalizedDsl.page.components.length;
  const nextCount = next.normalizedDsl.page.components.length;
  const diffs: V2DiffRecord[] = [];

  for (let i = prevCount; i < nextCount; i++) {
    diffs.push(makeEntityRecord('entity_added', `${screenId}-entity-${i}`));
  }
  for (let i = nextCount; i < prevCount; i++) {
    diffs.push(makeEntityRecord('entity_removed', `${screenId}-entity-${i}`));
  }

  const screenDiff: V2ScreenDiffInScope = {
    screen_id: screenId,
    diffs,
    entities: [],
  };
  return [screenDiff];
}
