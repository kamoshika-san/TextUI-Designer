import type { HeuristicPolicy } from '../diff/heuristic-policy';
import {
  createDiffResultSkeleton,
  type DiffCompareDocument,
  type DiffEvent,
} from '../textui-core-diff';
import {
  type MergeConflict,
  type ThreeWayCompareInput,
  type ThreeWayDiffResult,
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

function buildCandidateConflicts(leftEvents: DiffEvent[], rightEvents: DiffEvent[]): MergeConflict[] {
  const leftByEntityKey = groupEventsByEntityKey(leftEvents);
  const rightByEntityKey = groupEventsByEntityKey(rightEvents);
  const conflicts: MergeConflict[] = [];

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
        left: leftGroup.events.map(toThreeWayConflictEvidence),
        right: rightGroup.events.map(toThreeWayConflictEvidence),
      },
    });
  }

  return conflicts;
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
  const conflicts = buildCandidateConflicts(leftDiff.events, rightDiff.events);

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
