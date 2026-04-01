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
import type { TextUIDSL } from '../../domain/dsl-types';
import type { DiffSummaryImpactAxis } from '../textui-diff-review-impact';

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

export type ConflictFamily =
  | 'structural-conflict'
  | 'semantic-conflict'
  | 'permission-conflict';

export type ConflictType =
  | 'same-entity-divergent-move'
  | 'same-slot-divergent-add'
  | 'reorder-vs-remove'
  | 'rename-vs-replace'
  | 'same-property-different-value'
  | 'presentation-vs-behavior-escalation'
  | 'heuristic-vs-deterministic-disagreement'
  | 'permission-tighten-vs-loosen'
  | 'permission-gate-vs-state-transition'
  | 'permission-context-mismatch';

export type ConflictSeverity = 's1-notice' | 's2-review' | 's3-critical';
export type ConflictResolutionHint = 'auto-merge-safe' | 'manual-review-required';

export interface ConflictTaxonomy {
  family: ConflictFamily;
  type: ConflictType;
  impactAxis: DiffSummaryImpactAxis;
  summaryKey: string;
  ruleTrace: string;
}

export interface ConflictEvidenceSide {
  eventId: string;
  eventKind: DiffEventKind;
  pairingReason: DiffPairingReason;
  fallbackMarker: DiffFallbackMarker;
  path?: string;
  sourceRef?: DiffSourceRef;
  ruleTrace?: string;
  ambiguityReason?: DiffAmbiguityReason;
}

export interface CandidateMergeConflict {
  conflictId: string;
  entityKey: string;
  status: 'candidate';
  matchingBasis: 'entity-key-and-trace';
  leftEventIds: string[];
  rightEventIds: string[];
  evidence: {
    base?: ThreeWayConflictEvidence[];
    left: ThreeWayConflictEvidence[];
    right: ThreeWayConflictEvidence[];
  };
}

export interface MergeConflict {
  conflictId: string;
  type: ConflictType;
  severity: ConflictSeverity;
  entityKey: string;
  leftEventIds: string[];
  rightEventIds: string[];
  evidence: {
    base?: ConflictEvidenceSide;
    left: ConflictEvidenceSide;
    right: ConflictEvidenceSide;
  };
  resolutionHint: ConflictResolutionHint;
  status: 'candidate';
  matchingBasis: 'entity-key-and-trace';
  taxonomy: ConflictTaxonomy;
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

export type MergePreviewMode = 'safe-only' | 'with-conflicts';

export interface MergePreviewPatch {
  path: string;
  op: 'add' | 'remove' | 'replace';
  from?: unknown;
  to?: unknown;
}

export interface MergePreviewRequest {
  base: DiffCompareDocument;
  left: DiffCompareDocument;
  right: DiffCompareDocument;
  mode: MergePreviewMode;
}

export interface MergePreviewResponse {
  mergedDsl?: TextUIDSL;
  conflicts: MergeConflict[];
  previewPatches: MergePreviewPatch[];
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

export function toConflictEvidenceSide(
  evidence: ThreeWayConflictEvidence,
  ruleTrace?: string,
): ConflictEvidenceSide {
  const sourceRef = evidence.nextSourceRef ?? evidence.previousSourceRef;
  return {
    eventId: evidence.eventId,
    eventKind: evidence.kind,
    pairingReason: evidence.pairingReason,
    fallbackMarker: evidence.fallbackMarker,
    path: sourceRef?.entityPath,
    sourceRef,
    ruleTrace,
    ambiguityReason: evidence.ambiguityReason,
  };
}
