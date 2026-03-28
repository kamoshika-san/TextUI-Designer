import type { TextUIDSL } from '../domain/dsl-types';

export type DiffCompareSide = 'previous' | 'next';
export type DiffEntityKind = 'page' | 'component' | 'property';
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
  };
}

type DiffComponentNode = Record<string, unknown> & { __kind: string };
type DiffTreeBuild = {
  entity: DiffEntityResult;
  events: DiffEvent[];
  nextTraversalOrder: number;
};

const CHILD_COLLECTION_KEYS = ['components', 'fields', 'actions', 'items', 'children'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toComponentNode(component: unknown): DiffComponentNode | undefined {
  if (!isRecord(component)) {
    return undefined;
  }

  const keys = Object.keys(component);
  if (keys.length !== 1) {
    return undefined;
  }

  const kind = keys[0];
  const payload = component[kind];
  if (!isRecord(payload)) {
    return undefined;
  }

  return {
    ...payload,
    __kind: kind
  };
}

function buildEntityRefs(
  entityKind: DiffEntityKind,
  path: string,
  previousPageId: string,
  nextPageId: string,
  hasPrevious: boolean,
  hasNext: boolean
): Pick<DiffEntityResult, 'previous' | 'next'> {
  return {
    previous: hasPrevious ? {
      side: 'previous',
      entityKind,
      path,
      pageId: previousPageId
    } : undefined,
    next: hasNext ? {
      side: 'next',
      entityKind,
      path,
      pageId: nextPageId
    } : undefined
  };
}

function createPendingEvent(
  eventId: string,
  kind: DiffEventKind,
  entityKey: string,
  entityKind: DiffEntityKind,
  path: string,
  previous: DiffCompareDocument,
  next: DiffCompareDocument,
  hasPrevious: boolean,
  hasNext: boolean,
  identitySource: DiffIdentitySource
): DiffEvent {
  return {
    eventId,
    kind,
    entityKey,
    entityKind,
    status: 'pending',
    trace: {
      previousSourceRef: hasPrevious ? {
        side: 'previous',
        documentPath: previous.metadata.sourcePath,
        entityPath: path
      } : undefined,
      nextSourceRef: hasNext ? {
        side: 'next',
        documentPath: next.metadata.sourcePath,
        entityPath: path
      } : undefined,
      explicitness: entityKind === 'property' ? 'unknown' : 'preserved',
      identitySource,
      fallbackMarker: 'none',
      pairingReason: 'pending'
    }
  };
}

function collectChildComponentLists(node: DiffComponentNode | undefined): Array<{ key: string; items: unknown[] }> {
  if (!node) {
    return [];
  }

  return CHILD_COLLECTION_KEYS.flatMap(key => {
    const value = node[key];
    return Array.isArray(value) ? [{ key, items: value }] : [];
  });
}

function collectScalarPropertyKeys(node: DiffComponentNode | undefined): string[] {
  if (!node) {
    return [];
  }

  return Object.keys(node).filter(key => {
    if (key === '__kind') {
      return false;
    }
    if ((CHILD_COLLECTION_KEYS as readonly string[]).includes(key)) {
      return false;
    }
    const value = node[key];
    return !isRecord(value) && !Array.isArray(value);
  });
}

function buildPropertyEntity(
  path: string,
  previousValue: unknown,
  nextValue: unknown,
  previous: DiffCompareDocument,
  next: DiffCompareDocument,
  traversalOrder: number
): DiffTreeBuild {
  const hasPrevious = previousValue !== undefined;
  const hasNext = nextValue !== undefined;
  const entityKey = `property:${path}`;
  const event = createPendingEvent(
    `event:${entityKey}:update`,
    'update',
    entityKey,
    'property',
    path,
    previous,
    next,
    hasPrevious,
    hasNext,
    'none'
  );
  const refs = buildEntityRefs('property', path, previous.page.id, next.page.id, hasPrevious, hasNext);

  return {
    entity: {
      entityKey,
      entityKind: 'property',
      status: 'pending',
      ...refs,
      children: [],
      metadata: {
        classification: 'pending',
        eventCount: 1,
        eventIds: [event.eventId],
        traversalOrder
      }
    },
    events: [event],
    nextTraversalOrder: traversalOrder + 1
  };
}

function buildComponentEntity(
  previousComponent: unknown,
  nextComponent: unknown,
  path: string,
  previous: DiffCompareDocument,
  next: DiffCompareDocument,
  traversalOrder: number
): DiffTreeBuild {
  const previousNode = toComponentNode(previousComponent);
  const nextNode = toComponentNode(nextComponent);
  const hasPrevious = previousNode !== undefined;
  const hasNext = nextNode !== undefined;
  const previousKind = previousNode?.__kind;
  const nextKind = nextNode?.__kind;
  const entityKindLabel = previousKind ?? nextKind ?? 'Unknown';
  const entityKey = `component:${path}:${entityKindLabel}`;
  const refs = buildEntityRefs('component', path, previous.page.id, next.page.id, hasPrevious, hasNext);
  const rootEvent = createPendingEvent(
    `event:${entityKey}:update`,
    'update',
    entityKey,
    'component',
    path,
    previous,
    next,
    hasPrevious,
    hasNext,
    previousKind === nextKind && previousKind ? 'structural-path' : 'none'
  );

  let nextOrder = traversalOrder + 1;
  const children: DiffEntityResult[] = [];
  const events: DiffEvent[] = [rootEvent];

  const propertyKeys = new Set([
    ...collectScalarPropertyKeys(previousNode),
    ...collectScalarPropertyKeys(nextNode)
  ]);
  for (const propertyKey of propertyKeys) {
    const propertyBuild = buildPropertyEntity(
      `${path}/props/${propertyKey}`,
      previousNode?.[propertyKey],
      nextNode?.[propertyKey],
      previous,
      next,
      nextOrder
    );
    children.push(propertyBuild.entity);
    events.push(...propertyBuild.events);
    nextOrder = propertyBuild.nextTraversalOrder;
  }

  const childCollections = new Set([
    ...collectChildComponentLists(previousNode).map(entry => entry.key),
    ...collectChildComponentLists(nextNode).map(entry => entry.key)
  ]);
  for (const collectionKey of childCollections) {
    const previousItems = previousNode && Array.isArray(previousNode[collectionKey]) ? previousNode[collectionKey] as unknown[] : [];
    const nextItems = nextNode && Array.isArray(nextNode[collectionKey]) ? nextNode[collectionKey] as unknown[] : [];
    const maxLength = Math.max(previousItems.length, nextItems.length);
    for (let index = 0; index < maxLength; index++) {
      const childBuild = buildComponentEntity(
        previousItems[index],
        nextItems[index],
        `${path}/${collectionKey}/${index}`,
        previous,
        next,
        nextOrder
      );
      children.push(childBuild.entity);
      events.push(...childBuild.events);
      nextOrder = childBuild.nextTraversalOrder;
    }
  }

  return {
    entity: {
      entityKey,
      entityKind: 'component',
      status: 'pending',
      ...refs,
      children,
      metadata: {
        classification: 'pending',
        eventCount: events.length,
        eventIds: events.map(event => event.eventId),
        traversalOrder
      }
    },
    events,
    nextTraversalOrder: nextOrder
  };
}

function countEntities(entity: DiffEntityResult): number {
  return 1 + entity.children.reduce((sum, child) => sum + countEntities(child), 0);
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
  const rootEvent = createPendingEvent(
    `event:page:${previous.page.id}->${next.page.id}:update`,
    'update',
    `page:${previous.page.id}->${next.page.id}`,
    'page',
    '/page',
    previous,
    next,
    true,
    true,
    previous.page.id === next.page.id ? 'fallback-key' : 'structural-path'
  );

  let nextTraversalOrder = 1;
  const childEntities: DiffEntityResult[] = [];
  const childEvents: DiffEvent[] = [];

  const pagePropertyKeys = ['title', 'layout'] as const;
  for (const propertyKey of pagePropertyKeys) {
    const propertyBuild = buildPropertyEntity(
      `/page/props/${propertyKey}`,
      previous.page[propertyKey],
      next.page[propertyKey],
      previous,
      next,
      nextTraversalOrder
    );
    childEntities.push(propertyBuild.entity);
    childEvents.push(...propertyBuild.events);
    nextTraversalOrder = propertyBuild.nextTraversalOrder;
  }

  const maxComponents = Math.max(previous.normalizedDsl.page.components.length, next.normalizedDsl.page.components.length);
  for (let index = 0; index < maxComponents; index++) {
    const componentBuild = buildComponentEntity(
      previous.normalizedDsl.page.components[index],
      next.normalizedDsl.page.components[index],
      `/page/components/${index}`,
      previous,
      next,
      nextTraversalOrder
    );
    childEntities.push(componentBuild.entity);
    childEvents.push(...componentBuild.events);
    nextTraversalOrder = componentBuild.nextTraversalOrder;
  }

  const allEvents = [rootEvent, ...childEvents];

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
    children: childEntities,
    metadata: {
      classification: 'pending',
      eventCount: allEvents.length,
      eventIds: allEvents.map(event => event.eventId),
      traversalOrder: 0
    }
  };

  const entityCount = countEntities(rootEntity);

  return {
    kind: 'textui-diff-result',
    input: { previous, next },
    entityResults: [rootEntity],
    events: allEvents,
    metadata: {
      schemaVersion: 'diff-result/v0',
      compareStage: 'c1-skeleton',
      eventCount: allEvents.length,
      entityCount,
      traversal: 'pending',
      classification: 'pending',
      supportedEventKinds: ['add', 'remove', 'update', 'reorder', 'move', 'rename', 'remove+add']
    }
  };
}
