import type { DiffCompareDocument } from './diff-types';
import type {
  V2ScreenDiff,
  V2ScreenDiffInScope,
  V2DiffRecord,
} from './diff-v2-types';
import { buildV2Decision } from './v2-confidence-scorer';

export interface V2MatchedEntityPair {
  kind: 'matched';
  entityId: string;
  confidence: number;
  ambiguityReason?: string;
}

export interface V2UnmatchedEntityPair {
  kind: 'unmatched';
  removedEntityId: string;
  addedEntityId: string;
  confidence: number;
  ambiguityReason?: string;
}

export type V2EntityPair = V2MatchedEntityPair | V2UnmatchedEntityPair;

function makeEntityRecord(
  event: 'entity_added' | 'entity_removed',
  targetId: string,
  confidence: number,
  ambiguityReason?: string
): V2DiffRecord {
  return { decision: buildV2Decision(event, targetId, confidence, ambiguityReason), explanation: { evidence: [] } };
}

function normalizeEntityId(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function resolveMatchedEntityId(
  previous: DiffCompareDocument,
  next: DiffCompareDocument
): string {
  return normalizeEntityId(next.page.id)
    ?? normalizeEntityId(previous.page.id)
    ?? '/page';
}

export function pairEntityIdentityV2(
  previous: DiffCompareDocument,
  next: DiffCompareDocument
): V2EntityPair {
  const prevId = normalizeEntityId(previous.page.id);
  const nextId = normalizeEntityId(next.page.id);
  const sameTitle = previous.page.title === next.page.title;

  if (prevId && nextId) {
    if (prevId === nextId) {
      return {
        kind: 'matched',
        entityId: nextId,
        confidence: 1.0,
      };
    }

    if (sameTitle) {
      return {
        kind: 'unmatched',
        removedEntityId: prevId,
        addedEntityId: nextId,
        confidence: 0.5,
        ambiguityReason: 'same title, different id',
      };
    }

    return {
      kind: 'unmatched',
      removedEntityId: prevId,
      addedEntityId: nextId,
      confidence: 1.0,
    };
  }

  if (sameTitle) {
    return {
      kind: 'matched',
      entityId: resolveMatchedEntityId(previous, next),
      confidence: 0.7,
      ambiguityReason: 'matching title with missing entity id',
    };
  }

  return {
    kind: 'unmatched',
    removedEntityId: prevId ?? '/page',
    addedEntityId: nextId ?? '/page',
    confidence: 1.0,
  };
}

export function scanEntityDiffs(
  previous: DiffCompareDocument,
  next: DiffCompareDocument
): V2ScreenDiff[] {
  const pair = pairEntityIdentityV2(previous, next);
  const diffs: V2DiffRecord[] = [];

  if (pair.kind === 'unmatched') {
    diffs.push(makeEntityRecord('entity_removed', pair.removedEntityId, pair.confidence, pair.ambiguityReason));
    diffs.push(makeEntityRecord('entity_added', pair.addedEntityId, pair.confidence, pair.ambiguityReason));
  }

  const screenDiff: V2ScreenDiffInScope = {
    screen_id: resolveMatchedEntityId(previous, next),
    diffs,
    entities: [],
  };
  return [screenDiff];
}
