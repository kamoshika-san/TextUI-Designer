import type {
  DiffAmbiguityReason,
  DiffCompareDocument,
  DiffCompareResult,
  DiffEvent,
  DiffEventKind,
  DiffFallbackMarker,
  DiffPairingReason,
  DiffSourceRef,
} from '../textui-core-diff';

export interface ThreeWayCompareInput {
  base: DiffCompareDocument;
  left: DiffCompareDocument;
  right: DiffCompareDocument;
}

export interface ThreeWayConflictEvidence {
  eventId: string;
  kind: DiffEventKind;
  pairingReason: DiffPairingReason;
  fallbackMarker: DiffFallbackMarker;
  ambiguityReason?: DiffAmbiguityReason;
  previousSourceRef?: DiffSourceRef;
  nextSourceRef?: DiffSourceRef;
}

export interface MergeConflict {
  conflictId: string;
  entityKey: string;
  status: 'candidate';
  matchingBasis: 'entity-key-and-trace';
  leftEventIds: string[];
  rightEventIds: string[];
  evidence: {
    left: ThreeWayConflictEvidence[];
    right: ThreeWayConflictEvidence[];
  };
}

export interface ThreeWayDiffResult {
  kind: 'textui-three-way-diff-result';
  input: ThreeWayCompareInput;
  leftDiff: DiffCompareResult;
  rightDiff: DiffCompareResult;
  conflicts: MergeConflict[];
  metadata: {
    schemaVersion: 'three-way-diff/v0';
    conflictCount: number;
  };
}

export function toThreeWayConflictEvidence(event: DiffEvent): ThreeWayConflictEvidence {
  return {
    eventId: event.eventId,
    kind: event.kind,
    pairingReason: event.trace.pairingReason,
    fallbackMarker: event.trace.fallbackMarker,
    ambiguityReason: event.trace.ambiguityReason,
    previousSourceRef: event.trace.previousSourceRef,
    nextSourceRef: event.trace.nextSourceRef,
  };
}
