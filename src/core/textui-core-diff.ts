import type { TextUIDSL } from '../domain/dsl-types';

export type DiffCompareSide = 'previous' | 'next';
export type DiffEntityKind = 'page' | 'component';
export type DiffEntityStatus = 'pending';
export type DiffEventKind = 'add' | 'remove' | 'update' | 'reorder' | 'move' | 'rename' | 'remove+add';
export type DiffIdentitySource = 'explicit-id' | 'fallback-key' | 'structural-path' | 'none';
export type DiffFallbackMarker = 'none' | 'heuristic-pending' | 'remove-add-fallback';
export type DiffExplicitnessMarker = 'preserved' | 'not-applicable' | 'unknown';

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

export interface DiffTracePayload {
  previousSourceRef?: DiffSourceRef;
  nextSourceRef?: DiffSourceRef;
  explicitness: DiffExplicitnessMarker;
  identitySource: DiffIdentitySource;
  fallbackMarker: DiffFallbackMarker;
  pairingReason: 'pending';
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
  };
}

export function createNormalizedDiffDocument(
  normalizedDsl: TextUIDSL,
  options: {
    side: DiffCompareSide;
    sourcePath?: string;
  }
): DiffCompareDocument {
  return {
    side: options.side,
    normalizedDsl,
    page: {
      id: normalizedDsl.page.id,
      title: normalizedDsl.page.title,
      layout: normalizedDsl.page.layout,
      componentCount: normalizedDsl.page.components.length
    },
    metadata: {
      sourcePath: options.sourcePath,
      normalizationState: 'normalized-dsl',
      sourceRefPolicy: 'preserved',
      explicitnessPolicy: 'preserved',
      ownershipPolicy: 'preserved'
    }
  };
}

export function createDiffResultSkeleton(
  previous: DiffCompareDocument,
  next: DiffCompareDocument
): DiffCompareResult {
  const rootEvent: DiffEvent = {
    eventId: `event:page:${previous.page.id}->${next.page.id}:update`,
    kind: 'update',
    entityKey: `page:${previous.page.id}->${next.page.id}`,
    entityKind: 'page',
    status: 'pending',
    trace: {
      previousSourceRef: {
        side: 'previous',
        documentPath: previous.metadata.sourcePath,
        entityPath: '/page'
      },
      nextSourceRef: {
        side: 'next',
        documentPath: next.metadata.sourcePath,
        entityPath: '/page'
      },
      explicitness: 'preserved',
      identitySource: previous.page.id === next.page.id ? 'fallback-key' : 'structural-path',
      fallbackMarker: 'none',
      pairingReason: 'pending'
    }
  };

  const rootEntity: DiffEntityResult = {
    entityKey: rootEvent.entityKey,
    entityKind: 'page',
    status: 'pending',
    previous: {
      side: 'previous',
      entityKind: 'page',
      path: '/page',
      pageId: previous.page.id
    },
    next: {
      side: 'next',
      entityKind: 'page',
      path: '/page',
      pageId: next.page.id
    },
    children: [],
    metadata: {
      classification: 'pending',
      eventCount: 1,
      eventIds: [rootEvent.eventId]
    }
  };

  return {
    kind: 'textui-diff-result',
    input: { previous, next },
    entityResults: [rootEntity],
    events: [rootEvent],
    metadata: {
      schemaVersion: 'diff-result/v0',
      compareStage: 'c1-skeleton',
      eventCount: 1,
      entityCount: 1,
      traversal: 'pending',
      classification: 'pending',
      supportedEventKinds: ['add', 'remove', 'update', 'reorder', 'move', 'rename', 'remove+add']
    }
  };
}
