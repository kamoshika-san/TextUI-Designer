import type { DiffCompareDocument } from './diff-types';
import type {
  V2ScreenDiff,
  V2ScreenDiffInScope,
  V2DiffRecord,
  V2EntityDiff,
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
  ambiguityReason?: string,
  evidence: unknown[] = []
): V2DiffRecord {
  return { decision: buildV2Decision(event, targetId, confidence, ambiguityReason), explanation: { evidence } };
}

function makeStateRecord(
  targetId: string,
  confidence: number,
  beforeState: unknown,
  afterState: unknown,
  ambiguityReason?: string
): V2DiffRecord {
  return {
    decision: buildV2Decision('entity_state_changed', targetId, confidence, ambiguityReason),
    explanation: {
      evidence: ['entity state changed'],
      before_predicate: beforeState,
      after_predicate: afterState,
    },
  };
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

function stableStateStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStateStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStateStringify(nested)}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function readEntityState(document: DiffCompareDocument): unknown {
  return ((document.normalizedDsl.page as unknown) as Record<string, unknown>)['state'];
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
  const entities: V2EntityDiff[] = [];

  if (pair.kind === 'unmatched') {
    diffs.push(makeEntityRecord('entity_removed', pair.removedEntityId, pair.confidence, pair.ambiguityReason, ['entity removed']));
    diffs.push(makeEntityRecord('entity_added', pair.addedEntityId, pair.confidence, pair.ambiguityReason, ['entity added']));
  } else {
    const previousState = readEntityState(previous);
    const nextState = readEntityState(next);
    if (stableStateStringify(previousState) !== stableStateStringify(nextState)) {
      entities.push({
        entity_id: pair.entityId,
        diffs: [makeStateRecord(pair.entityId, pair.confidence, previousState, nextState, pair.ambiguityReason)],
        components: [],
      });
    }
  }

  const screenDiff: V2ScreenDiffInScope = {
    screen_id: resolveMatchedEntityId(previous, next),
    diffs,
    entities,
  };
  return [screenDiff];
}
