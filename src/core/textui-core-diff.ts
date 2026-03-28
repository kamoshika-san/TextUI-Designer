import type { TextUIDSL } from '../domain/dsl-types';

export type DiffCompareSide = 'previous' | 'next';
export type DiffEntityKind = 'page' | 'component';
export type DiffEntityStatus = 'pending';

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
  };
}

export interface DiffCompareResult {
  kind: 'textui-diff-result';
  input: {
    previous: DiffCompareDocument;
    next: DiffCompareDocument;
  };
  entityResults: DiffEntityResult[];
  events: [];
  metadata: {
    schemaVersion: 'diff-result/v0';
    compareStage: 'c1-skeleton';
    eventCount: number;
    entityCount: number;
    traversal: 'pending';
    classification: 'pending';
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
  const rootEntity: DiffEntityResult = {
    entityKey: `page:${previous.page.id}->${next.page.id}`,
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
      eventCount: 0
    }
  };

  return {
    kind: 'textui-diff-result',
    input: { previous, next },
    entityResults: [rootEntity],
    events: [],
    metadata: {
      schemaVersion: 'diff-result/v0',
      compareStage: 'c1-skeleton',
      eventCount: 0,
      entityCount: 1,
      traversal: 'pending',
      classification: 'pending'
    }
  };
}
