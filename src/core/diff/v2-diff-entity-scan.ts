import type { DiffCompareDocument } from './diff-types';
import type {
  V2ScreenDiff,
  V2ScreenDiffInScope,
  V2DiffRecord,
} from './diff-v2-types';
import { buildV2Decision } from './v2-confidence-scorer';

function makeEntityRecord(
  event: 'entity_added' | 'entity_removed',
  targetId: string,
  confidence: number,
  ambiguityReason?: string
): V2DiffRecord {
  return { decision: buildV2Decision(event, targetId, confidence, ambiguityReason), explanation: { evidence: [] } };
}

export function scanEntityDiffs(
  previous: DiffCompareDocument,
  next: DiffCompareDocument
): V2ScreenDiff[] {
  const prevId = previous.page.id;
  const nextId = next.page.id;
  const diffs: V2DiffRecord[] = [];

  if (prevId !== nextId) {
    const sameTitle = previous.page.title === next.page.title;
    const confidence = sameTitle ? 0.5 : 1.0;
    const ambiguityReason = sameTitle ? 'same title, different id' : undefined;
    diffs.push(makeEntityRecord('entity_removed', prevId, confidence, ambiguityReason));
    diffs.push(makeEntityRecord('entity_added', nextId, confidence, ambiguityReason));
  }

  const screenDiff: V2ScreenDiffInScope = {
    screen_id: prevId,
    diffs,
    entities: [],
  };
  return [screenDiff];
}
