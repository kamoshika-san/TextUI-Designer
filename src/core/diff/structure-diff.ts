import type {
  DiffCompareSide,
  DiffEntityKind,
  DiffEventKind,
  DiffIdentitySource,
  DiffFallbackMarker,
  DiffExplicitnessMarker,
  DiffPairingReason,
  DiffFallbackConfidence,
  DiffAmbiguityReason,
  DiffHeuristicTrace,
  DiffCompareDocument,
  DiffEntityRef,
  DiffSourceRef,
  DiffTracePayload,
  DiffEvent,
  DiffEntityResult,
  DiffCompareResult,
  DiffRenderTargetRef,
  DiffRenderTarget,
} from './diff-types';
import {
  type DiffComponentNode,
  type DiffCollectionCandidate,
  type DiffPairedCandidate,
  type DiffDeterministicIdentity,
  CHILD_COLLECTION_KEYS,
  FALLBACK_IDENTITY_KEYS,
  isRecord,
  toComponentNode,
  normalizeIdentityValue,
  resolvePageDeterministicIdentity,
  resolveComponentDeterministicIdentity,
  classifyComponentEventKind,
  pairCollectionCandidates,
  collectChildComponentLists,
  collectScalarPropertyKeys,
} from './diff-pairing';
import {
  type HeuristicPolicy,
  DEFAULT_HEURISTIC_POLICY,
  computePolicyHash,
} from './heuristic-policy';
import type { TextUIDSL } from '../../domain/dsl-types';

type DiffTreeBuild = {
  entity: DiffEntityResult;
  events: DiffEvent[];
  nextTraversalOrder: number;
};

function buildEntityRefs(
  entityKind: DiffEntityKind,
  previousPath: string,
  nextPath: string,
  previousPageId: string,
  nextPageId: string,
  hasPrevious: boolean,
  hasNext: boolean
): Pick<DiffEntityResult, 'previous' | 'next'> {
  return {
    previous: hasPrevious ? {
      side: 'previous',
      entityKind,
      path: previousPath,
      pageId: previousPageId
    } : undefined,
    next: hasNext ? {
      side: 'next',
      entityKind,
      path: nextPath,
      pageId: nextPageId
    } : undefined
  };
}

function createPendingEvent(
  eventId: string,
  kind: DiffEventKind,
  entityKey: string,
  entityKind: DiffEntityKind,
  previousPath: string,
  nextPath: string,
  previous: DiffCompareDocument,
  next: DiffCompareDocument,
  hasPrevious: boolean,
  hasNext: boolean,
  identitySource: DiffIdentitySource,
  pairingReason: DiffPairingReason,
  fallbackMarker: DiffFallbackMarker = 'none',
  fallbackConfidence: DiffFallbackConfidence = 'not-applicable',
  ambiguityReason?: DiffAmbiguityReason,
  heuristicTrace?: DiffHeuristicTrace
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
        entityPath: previousPath
      } : undefined,
      nextSourceRef: hasNext ? {
        side: 'next',
        documentPath: next.metadata.sourcePath,
        entityPath: nextPath
      } : undefined,
      explicitness: entityKind === 'property' ? 'unknown' : 'preserved',
      identitySource,
      fallbackMarker,
      fallbackConfidence,
      pairingReason,
      ambiguityReason,
      heuristicTrace,
    }
  };
}

function buildPropertyEntity(
  path: string,
  previousValue: unknown,
  nextValue: unknown,
  previous: DiffCompareDocument,
  next: DiffCompareDocument,
  traversalOrder: number,
  previousPath?: string
): DiffTreeBuild {
  const hasPrevious = previousValue !== undefined;
  const hasNext = nextValue !== undefined;
  const entityKey = `property:${path}`;
  const kind: DiffEventKind = hasPrevious && hasNext ? 'update' : hasPrevious ? 'remove' : 'add';
  const explicitness: DiffExplicitnessMarker = hasPrevious && hasNext
    ? 'preserved'
    : hasPrevious
      ? 'absent-on-next'
      : 'absent-on-previous';
  const prevPath = previousPath ?? path;
  const event = createPendingEvent(
    `event:${entityKey}:${kind}`,
    kind,
    entityKey,
    'property',
    prevPath,
    path,
    previous,
    next,
    hasPrevious,
    hasNext,
    'none',
    hasPrevious && hasNext ? 'deterministic-structural-path' : 'unpaired'
  );
  event.trace.explicitness = explicitness;
  const refs = buildEntityRefs('property', prevPath, path, previous.page.id, next.page.id, hasPrevious, hasNext);

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
  previousPath: string,
  nextPath: string,
  previous: DiffCompareDocument,
  next: DiffCompareDocument,
  traversalOrder: number,
  pairedCandidateMetadata?: DiffPairedCandidate,
  policy: HeuristicPolicy = DEFAULT_HEURISTIC_POLICY,
  policyHash: string = computePolicyHash(policy)
): DiffTreeBuild {
  const previousNode = toComponentNode(previousComponent);
  const nextNode = toComponentNode(nextComponent);
  const hasPrevious = previousNode !== undefined;
  const hasNext = nextNode !== undefined;
  const deterministicIdentity = resolveComponentDeterministicIdentity(previousNode, nextNode, nextPath);
  const pairingReason = pairedCandidateMetadata?.pairingReason ?? deterministicIdentity.pairingReason;
  const identitySource = pairingReason === 'heuristic-similarity'
    ? 'none'
    : deterministicIdentity.identitySource;
  const fallbackMarker = pairedCandidateMetadata?.fallbackMarker ?? 'none';
  const fallbackConfidence = pairedCandidateMetadata?.fallbackConfidence ?? 'not-applicable';
  const ambiguityReason = pairedCandidateMetadata?.ambiguityReason;
  const heuristicTrace = pairedCandidateMetadata?.heuristicTrace;
  const entityKey = `component:${deterministicIdentity.entityKeySuffix}`;
  const refs = buildEntityRefs('component', previousPath, nextPath, previous.page.id, next.page.id, hasPrevious, hasNext);
  const classification = classifyComponentEventKind(
    previousNode,
    nextNode,
    previousPath,
    nextPath,
    identitySource,
    pairingReason
  );
  const rootEvent = createPendingEvent(
    `event:${entityKey}:${classification.kind}`,
    classification.kind,
    entityKey,
    'component',
    previousPath,
    nextPath,
    previous,
    next,
    hasPrevious,
    hasNext,
    identitySource,
    pairingReason,
    fallbackMarker === 'none' ? classification.fallbackMarker : fallbackMarker,
    fallbackConfidence,
    ambiguityReason,
    heuristicTrace
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
      `${nextPath}/props/${propertyKey}`,
      previousNode?.[propertyKey],
      nextNode?.[propertyKey],
      previous,
      next,
      nextOrder,
      previousPath !== nextPath ? `${previousPath}/props/${propertyKey}` : undefined
    );
    children.push(propertyBuild.entity);
    events.push(...propertyBuild.events);
    nextOrder = propertyBuild.nextTraversalOrder;
  }

  const previousCandidates = collectChildComponentLists(previousNode).flatMap(entry =>
    entry.items.map((item, index) => ({
      item,
      path: `${previousPath}/${entry.key}/${index}`,
      index,
      collectionKey: entry.key
    }))
  );
  const nextCandidates = collectChildComponentLists(nextNode).flatMap(entry =>
    entry.items.map((item, index) => ({
      item,
      path: `${nextPath}/${entry.key}/${index}`,
      index,
      collectionKey: entry.key
    }))
  );
  for (const pairedCandidate of pairCollectionCandidates(previousCandidates, nextCandidates, policy, policyHash)) {
    const childBuild = buildComponentEntity(
      pairedCandidate.previous?.item,
      pairedCandidate.next?.item,
      pairedCandidate.previous?.path ?? pairedCandidate.next?.path ?? `${previousPath}/components/0`,
      pairedCandidate.next?.path ?? pairedCandidate.previous?.path ?? `${nextPath}/components/0`,
      previous,
      next,
      nextOrder,
      pairedCandidate,
      policy,
      policyHash
    );
    children.push(childBuild.entity);
    events.push(...childBuild.events);
    nextOrder = childBuild.nextTraversalOrder;
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

function toRenderTargetRef(ref: DiffEntityRef | undefined): DiffRenderTargetRef | undefined {
  if (!ref?.path || !ref.pageId) {
    return undefined;
  }

  return {
    side: ref.side,
    path: ref.path,
    pageId: ref.pageId
  };
}

function getValueAtDslPath(root: unknown, path: string): unknown {
  if (path === '/page') {
    return isRecord(root) ? root.page : undefined;
  }

  const segments = path.split('/').filter(Boolean);
  let current: unknown = root;

  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      current = Number.isInteger(index) ? current[index] : undefined;
      continue;
    }

    const componentNode = toComponentNode(current);
    if (componentNode) {
      if (segment === 'props') {
        current = componentNode;
        continue;
      }

      if (segment in componentNode) {
        current = componentNode[segment];
        continue;
      }
    }

    if (!isRecord(current)) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

function toChildAnchor(item: unknown, index: number): string {
  const node = toComponentNode(item);
  if (!node) {
    return `unknown:${index}`;
  }

  const explicitId = normalizeIdentityValue(node.id);
  if (explicitId) {
    return `${node.__kind}:${explicitId}`;
  }

  for (const key of FALLBACK_IDENTITY_KEYS) {
    const fallback = normalizeIdentityValue(node[key]);
    if (fallback) {
      return `${node.__kind}:${key}:${fallback}`;
    }
  }

  return `${node.__kind}:index:${index}`;
}

function buildBoundaryComparable(value: unknown): unknown {
  if (!isRecord(value)) {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        const node = toComponentNode(item);
        return node ? toChildAnchor(item, index) : buildBoundaryComparable(item);
      });
    }
    return value;
  }

  const componentNode = toComponentNode(value);
  if (componentNode) {
    const ownEntries = Object.entries(componentNode)
      .filter(([key]) => key !== '__kind' && !CHILD_COLLECTION_KEYS.includes(key as typeof CHILD_COLLECTION_KEYS[number]))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, buildBoundaryComparable(nested)] as const);

    const childCollections = CHILD_COLLECTION_KEYS
      .filter(key => Array.isArray(componentNode[key]))
      .map(key => [
        key,
        (componentNode[key] as unknown[]).map((item, index) => toChildAnchor(item, index))
      ] as const);

    return {
      __kind: componentNode.__kind,
      own: Object.fromEntries(ownEntries),
      childCollections: Object.fromEntries(childCollections)
    };
  }

  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, buildBoundaryComparable(nested)] as const)
  );
}

function stableStringifyBoundary(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringifyBoundary(item)).join(',')}]`;
  }

  if (isRecord(value)) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringifyBoundary(nested)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function boundaryChangedForEntity(entity: DiffEntityResult, result: DiffCompareResult): boolean {
  if (entity.entityKind === 'page') {
    return true;
  }

  const previousPath = entity.previous?.path;
  const nextPath = entity.next?.path;
  if (!previousPath && !nextPath) {
    return false;
  }
  if (!previousPath || !nextPath) {
    return true;
  }

  const previousValue = getValueAtDslPath(result.input.previous.normalizedDsl, previousPath);
  const nextValue = getValueAtDslPath(result.input.next.normalizedDsl, nextPath);

  return stableStringifyBoundary(buildBoundaryComparable(previousValue))
    !== stableStringifyBoundary(buildBoundaryComparable(nextValue));
}

function collectRenderTargets(
  entity: DiffEntityResult,
  result: DiffCompareResult,
  eventKindById: Map<string, DiffEventKind>,
  targets: DiffRenderTarget[]
): void {
  if ((entity.entityKind === 'page' || entity.entityKind === 'component') && boundaryChangedForEntity(entity, result)) {
    const primaryEventKind = entity.metadata.eventIds.length > 0
      ? eventKindById.get(entity.metadata.eventIds[0])
      : undefined;
    const eventKinds = primaryEventKind ? [primaryEventKind] : [];
    const previous = toRenderTargetRef(entity.previous);
    const next = toRenderTargetRef(entity.next);

    targets.push({
      targetId: entity.entityKey,
      entityKey: entity.entityKey,
      scope: entity.entityKind,
      eventKinds,
      previous,
      next,
      resolution: eventKinds.length > 0 && (previous !== undefined || next !== undefined)
        ? 'resolved'
        : 'unresolved'
    });
  }

  for (const child of entity.children) {
    collectRenderTargets(child, result, eventKindById, targets);
  }
}

export function buildRenderTargetsFromDiffResult(result: DiffCompareResult): DiffRenderTarget[] {
  const eventKindById = new Map(result.events.map(event => [event.eventId, event.kind]));
  const targets: DiffRenderTarget[] = [];

  for (const entity of result.entityResults) {
    collectRenderTargets(entity, result, eventKindById, targets);
  }

  return targets;
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
  next: DiffCompareDocument,
  policy?: HeuristicPolicy
): DiffCompareResult {
  const effectivePolicy = policy ?? DEFAULT_HEURISTIC_POLICY;
  const policyHash = computePolicyHash(effectivePolicy);
  const pageIdentity = resolvePageDeterministicIdentity(previous, next);
  const rootEvent = createPendingEvent(
    `event:page:${previous.page.id}->${next.page.id}:update`,
    'update',
    `page:${pageIdentity.entityKeySuffix}`,
    'page',
    '/page',
    '/page',
    previous,
    next,
    true,
    true,
    pageIdentity.identitySource,
    pageIdentity.pairingReason
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
  void maxComponents; // unused after pairing refactor; kept for clarity
  const pairedPageComponents = pairCollectionCandidates(
    previous.normalizedDsl.page.components.map((item, index) => ({ item, path: `/page/components/${index}`, index, collectionKey: 'components' })),
    next.normalizedDsl.page.components.map((item, index) => ({ item, path: `/page/components/${index}`, index, collectionKey: 'components' })),
    effectivePolicy,
    policyHash
  );
  for (const pairedCandidate of pairedPageComponents) {
    const componentBuild = buildComponentEntity(
      pairedCandidate.previous?.item,
      pairedCandidate.next?.item,
      pairedCandidate.previous?.path ?? pairedCandidate.next?.path ?? '/page/components/0',
      pairedCandidate.next?.path ?? pairedCandidate.previous?.path ?? '/page/components/0',
      previous,
      next,
      nextTraversalOrder,
      pairedCandidate,
      effectivePolicy,
      policyHash
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
      supportedEventKinds: ['add', 'remove', 'update', 'reorder', 'move', 'rename', 'remove+add'],
      policyHash,
    }
  };
}
