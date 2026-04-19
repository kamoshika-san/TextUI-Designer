import type { DiffCompareDocument } from './diff-types';
import type {
  V2ComponentDiff,
  V2DiffRecord,
  V2HighConfidenceDecision,
} from './diff-v2-types';

function makeComponentRecord(
  event: 'component_added' | 'component_removed',
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
 * Pure function: detects component_added / component_removed between two versions
 * of the same screen. Comparison is index-based (count delta); pairing refinement
 * is a future sprint.
 */
export function scanComponentDiffs(
  previous: DiffCompareDocument,
  next: DiffCompareDocument
): V2ComponentDiff[] {
  const screenId = previous.page.id;
  const prevCount = previous.normalizedDsl.page.components.length;
  const nextCount = next.normalizedDsl.page.components.length;
  const result: V2ComponentDiff[] = [];

  for (let i = prevCount; i < nextCount; i++) {
    const componentId = `${screenId}-cmp-${i}`;
    result.push({
      component_id: componentId,
      diffs: [makeComponentRecord('component_added', componentId)],
    });
  }
  for (let i = nextCount; i < prevCount; i++) {
    const componentId = `${screenId}-cmp-${i}`;
    result.push({
      component_id: componentId,
      diffs: [makeComponentRecord('component_removed', componentId)],
    });
  }

  return result;
}
