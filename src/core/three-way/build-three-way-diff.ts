import type { HeuristicPolicy } from '../diff/heuristic-policy';
import {
  createDiffResultSkeleton,
  type DiffCompareDocument,
  type DiffEvent,
} from '../textui-core-diff';
import { classifyConflict } from './classify-conflicts';
import {
  type CandidateMergeConflict,
  type ConflictResolutionHint,
  type ConflictSeverity,
  type MergeConflict,
  type ThreeWayCompareInput,
  type ThreeWayDiffResult,
  toConflictEvidenceSide,
  toThreeWayConflictEvidence,
} from './types';

type EventGroup = {
  entityKey: string;
  events: DiffEvent[];
};

function retagDocument(document: DiffCompareDocument, side: 'previous' | 'next'): DiffCompareDocument {
  return {
    ...document,
    side,
  };
}

function groupEventsByEntityKey(events: DiffEvent[]): Map<string, EventGroup> {
  const grouped = new Map<string, EventGroup>();
  for (const event of events) {
    const existing = grouped.get(event.entityKey);
    if (existing) {
      existing.events.push(event);
      continue;
    }
    grouped.set(event.entityKey, {
      entityKey: event.entityKey,
      events: [event],
    });
  }
  return grouped;
}

function buildBaseEvidence(
  leftEvents: DiffEvent[],
  rightEvents: DiffEvent[],
): CandidateMergeConflict['evidence']['base'] {
  const baseEvent = [...leftEvents, ...rightEvents].find(
    event => event.trace.previousSourceRef || event.trace.nextSourceRef,
  );
  if (!baseEvent) {
    return undefined;
  }
  const baseSourceRef = baseEvent.trace.previousSourceRef ?? baseEvent.trace.nextSourceRef;
  return [{
    eventId: `base:${baseEvent.eventId}`,
    kind: baseEvent.kind,
    pairingReason: baseEvent.trace.pairingReason,
    fallbackMarker: baseEvent.trace.fallbackMarker,
    ambiguityReason: baseEvent.trace.ambiguityReason,
    previousSourceRef: baseSourceRef,
    nextSourceRef: undefined,
  }];
}

function buildCandidateConflicts(leftEvents: DiffEvent[], rightEvents: DiffEvent[]): CandidateMergeConflict[] {
  const leftByEntityKey = groupEventsByEntityKey(leftEvents);
  const rightByEntityKey = groupEventsByEntityKey(rightEvents);
  const conflicts: CandidateMergeConflict[] = [];

  for (const [entityKey, leftGroup] of leftByEntityKey.entries()) {
    const rightGroup = rightByEntityKey.get(entityKey);
    if (!rightGroup) {
      continue;
    }
    conflicts.push({
      conflictId: `conflict:${entityKey}`,
      entityKey,
      status: 'candidate',
      matchingBasis: 'entity-key-and-trace',
      leftEventIds: leftGroup.events.map(event => event.eventId),
      rightEventIds: rightGroup.events.map(event => event.eventId),
      evidence: {
        base: buildBaseEvidence(leftGroup.events, rightGroup.events),
        left: leftGroup.events.map(toThreeWayConflictEvidence),
        right: rightGroup.events.map(toThreeWayConflictEvidence),
      },
    });
  }

  return conflicts;
}

function resolveConflictSeverity(type: MergeConflict['type']): ConflictSeverity {
  switch (type) {
    case 'rename-vs-replace':
    case 'reorder-vs-remove':
    case 'permission-tighten-vs-loosen':
    case 'permission-gate-vs-state-transition':
    case 'permission-context-mismatch':
      return 's3-critical';
    case 'same-entity-divergent-move':
    case 'same-slot-divergent-add':
    case 'presentation-vs-behavior-escalation':
    case 'heuristic-vs-deterministic-disagreement':
      return 's2-review';
    case 'same-property-different-value':
    default:
      return 's1-notice';
  }
}

function resolveResolutionHint(type: MergeConflict['type']): ConflictResolutionHint {
  switch (type) {
    case 'same-property-different-value':
      return 'auto-merge-safe';
    default:
      return 'manual-review-required';
  }
}

export function materializeMergeConflict(candidate: CandidateMergeConflict): MergeConflict {
  const classified = classifyConflict(candidate);
  return {
    conflictId: classified.conflictId,
    type: classified.taxonomy.type,
    severity: resolveConflictSeverity(classified.taxonomy.type),
    entityKey: classified.entityKey,
    leftEventIds: classified.leftEventIds,
    rightEventIds: classified.rightEventIds,
    evidence: {
      base: classified.evidence.base?.[0]
        ? toConflictEvidenceSide(classified.evidence.base[0], classified.taxonomy.ruleTrace)
        : undefined,
      left: toConflictEvidenceSide(classified.evidence.left[0], classified.taxonomy.ruleTrace),
      right: toConflictEvidenceSide(classified.evidence.right[0], classified.taxonomy.ruleTrace),
    },
    resolutionHint: resolveResolutionHint(classified.taxonomy.type),
    status: classified.status,
    matchingBasis: classified.matchingBasis,
    taxonomy: classified.taxonomy,
  };
}

export function buildThreeWayDiffResult(
  input: ThreeWayCompareInput,
  policy?: HeuristicPolicy
): ThreeWayDiffResult {
  const leftDiff = createDiffResultSkeleton(
    retagDocument(input.base, 'previous'),
    retagDocument(input.left, 'next'),
    policy
  );
  const rightDiff = createDiffResultSkeleton(
    retagDocument(input.base, 'previous'),
    retagDocument(input.right, 'next'),
    policy
  );
  const conflicts = buildCandidateConflicts(leftDiff.events, rightDiff.events).map(materializeMergeConflict);

  return {
    kind: 'textui-three-way-diff-result',
    input,
    leftDiff,
    rightDiff,
    conflicts,
    metadata: {
      schemaVersion: 'three-way-diff/v0',
      conflictCount: conflicts.length,
    },
  };
}
