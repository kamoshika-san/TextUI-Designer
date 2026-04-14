import type {
  NavigationFlowDSL,
  NavigationGuardDef,
  NavigationLoopPolicy,
  NavigationScreenKind,
  NavigationTerminalDef,
  NavigationTransitionKind,
  TextUIDSL,
} from '../../domain/dsl-types';

export type DiffCompareSide = 'previous' | 'next';
export type DiffEntityKind = 'page' | 'component' | 'property' | 'flow' | 'transition';
export type DiffEntityStatus = 'pending';
export type DiffEventKind = 'add' | 'remove' | 'update' | 'reorder' | 'move' | 'rename' | 'remove+add';
export type DiffIdentitySource = 'explicit-id' | 'fallback-key' | 'structural-path' | 'none';
export type DiffFallbackMarker = 'none' | 'heuristic-pending' | 'remove-add-fallback';
export type DiffExplicitnessMarker = 'preserved' | 'not-applicable' | 'unknown' | 'absent-on-previous' | 'absent-on-next';
export type DiffPairingReason = 'deterministic-explicit-id' | 'deterministic-fallback-key' | 'deterministic-structural-path' | 'heuristic-similarity' | 'unpaired';
export type DiffFallbackConfidence = 'not-applicable' | 'high';
export type DiffHeuristicRejection = 'forbidden-zone' | 'tie' | 'threshold' | 'no-candidates';

export interface DiffHeuristicTrace {
  attempted: boolean;
  accepted: boolean;
  totalScore?: number;
  minScore?: number;
  policyHash?: string;
  components?: {
    scalarExact: number;
    childSignature: number;
    keysetMatch: number;
  };
  rejectedBy?: DiffHeuristicRejection;
  ambiguityReason?: DiffAmbiguityReason;
}

export interface DiffCompareDocument {
  side: DiffCompareSide;
  normalizedDsl: TextUIDSL;
  page: {
    id: string;
    title: string;
    layout: string;
    componentCount: number;
  };
  metadata: {
    sourcePath?: string;
    normalizationState: 'normalized-dsl';
    sourceRefPolicy: 'preserved';
    explicitnessPolicy: 'preserved';
    ownershipPolicy: 'preserved';
  };
}

export interface FlowDiffScreenRef {
  id: string;
  page?: string;
  title?: string;
  kind?: NavigationScreenKind;
  tags?: string[];
  terminal?: NavigationTerminalDef;
  path: string;
}

export interface FlowDiffTransitionRef {
  key: string;
  id?: string;
  from: string;
  to: string;
  trigger: string;
  label?: string;
  condition?: string;
  params?: string[];
  kind?: NavigationTransitionKind;
  tags?: string[];
  guard?: NavigationGuardDef;
  path: string;
}

export interface FlowDiffCompareDocument {
  side: DiffCompareSide;
  normalizedDsl: NavigationFlowDSL;
  flow: {
    id: string;
    title: string;
    entry: string;
    version: string;
    loopPolicy: NavigationLoopPolicy;
    terminalScreensRequired: boolean;
    screenCount: number;
    transitionCount: number;
  };
  screens: FlowDiffScreenRef[];
  transitions: FlowDiffTransitionRef[];
  metadata: {
    sourcePath?: string;
    normalizationState: 'normalized-flow';
    sourceRefPolicy: 'preserved';
    explicitnessPolicy: 'preserved';
    ownershipPolicy: 'preserved';
  };
}

export type FlowDiffEvent =
  | {
      kind: 'add';
      entity: 'screen';
      def: FlowDiffScreenRef;
    }
  | {
      kind: 'remove';
      entity: 'screen';
      def: FlowDiffScreenRef;
    }
  | {
      kind: 'add';
      entity: 'transition';
      def: FlowDiffTransitionRef;
    }
  | {
      kind: 'remove';
      entity: 'transition';
      def: FlowDiffTransitionRef;
    }
  | {
      kind: 'update';
      entity: 'flow';
      field: 'id' | 'title' | 'entry' | 'version' | 'loopPolicy' | 'terminalScreensRequired';
      prev: string | boolean;
      next: string | boolean;
    }
  | {
      kind: 'update';
      entity: 'screen';
      field: 'page' | 'title' | 'kind' | 'tags' | 'terminal';
      def: FlowDiffScreenRef;
      prev: string | string[] | NavigationTerminalDef | undefined;
      next: string | string[] | NavigationTerminalDef | undefined;
    }
  | {
      kind: 'update';
      entity: 'transition';
      field: 'from' | 'to' | 'trigger' | 'label' | 'condition' | 'params' | 'kind' | 'tags' | 'guard';
      def: FlowDiffTransitionRef;
      prev: string | string[] | NavigationGuardDef | undefined;
      next: string | string[] | NavigationGuardDef | undefined;
    };

export interface FlowDiffNormalizationResult {
  previous: FlowDiffCompareDocument;
  next: FlowDiffCompareDocument;
  events: FlowDiffEvent[];
  metadata: {
    compareStage: 'd1-flow-normalizer';
    eventCount: number;
  };
}

export interface DiffEntityRef {
  side: 'previous' | 'next' | 'paired';
  entityKind: DiffEntityKind;
  path: string;
  pageId: string;
}

export interface DiffSourceRef {
  side: DiffCompareSide;
  documentPath?: string;
  entityPath: string;
}

export type DiffAmbiguityReason = 'tie-best-score' | 'multi-candidate' | 'below-threshold';

export interface DiffTracePayload {
  previousSourceRef?: DiffSourceRef;
  nextSourceRef?: DiffSourceRef;
  explicitness: DiffExplicitnessMarker;
  identitySource: DiffIdentitySource;
  fallbackMarker: DiffFallbackMarker;
  fallbackConfidence: DiffFallbackConfidence;
  pairingReason: DiffPairingReason;
  /** Set when heuristic pairing was rejected due to ambiguity (tie/multi/below-threshold). */
  ambiguityReason?: DiffAmbiguityReason;
  /** Heuristic scoring trace for auditability. Present only for heuristic-attempted events. */
  heuristicTrace?: DiffHeuristicTrace;
}

export interface DiffEvent {
  eventId: string;
  kind: DiffEventKind;
  entityKey: string;
  entityKind: DiffEntityKind;
  status: 'pending';
  trace: DiffTracePayload;
}

export interface DiffEntityResult {
  entityKey: string;
  entityKind: DiffEntityKind;
  status: DiffEntityStatus;
  previous?: DiffEntityRef;
  next?: DiffEntityRef;
  children: DiffEntityResult[];
  metadata: {
    classification: 'pending';
    eventCount: number;
    eventIds: string[];
    traversalOrder: number;
  };
}

export interface DiffCompareResult {
  kind: 'textui-diff-result';
  input: {
    previous: DiffCompareDocument;
    next: DiffCompareDocument;
  };
  entityResults: DiffEntityResult[];
  events: DiffEvent[];
  metadata: {
    schemaVersion: 'diff-result/v0';
    compareStage: 'c1-skeleton';
    eventCount: number;
    entityCount: number;
    traversal: 'pending';
    classification: 'pending';
    supportedEventKinds: DiffEventKind[];
    /** Short hash of the HeuristicPolicy used during this diff (for reproducibility). */
    policyHash?: string;
  };
}

export type DiffRenderTargetScope = 'page' | 'component';
export type DiffRenderTargetResolution = 'resolved' | 'unresolved';

export interface DiffRenderTargetRef {
  side: DiffEntityRef['side'];
  path: string;
  pageId: string;
}

export interface DiffRenderTarget {
  targetId: string;
  entityKey: string;
  scope: DiffRenderTargetScope;
  eventKinds: DiffEventKind[];
  previous?: DiffRenderTargetRef;
  next?: DiffRenderTargetRef;
  resolution: DiffRenderTargetResolution;
}

