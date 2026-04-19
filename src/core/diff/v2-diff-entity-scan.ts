import type { DiffCompareDocument } from './diff-types';
import type {
  V2ScreenDiff,
  V2ScreenDiffInScope,
  V2DiffRecord,
} from './diff-v2-types';
import { buildV2Decision } from './v2-confidence-scorer';

function makeEntityRecord(
  event: 'entity_added' | 'entity_removed',
  targetId: string
): V2DiffRecord {
  return { decision: buildV2Decision(event, targetId, 1.0), explanation: { evidence: [] } };
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
