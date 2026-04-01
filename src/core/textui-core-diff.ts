import type { TextUIDSL } from '../domain/dsl-types';
import {
  type HeuristicPolicy,
  DEFAULT_HEURISTIC_POLICY,
  computePolicyHash,
} from './diff/heuristic-policy';

export type DiffCompareSide = 'previous' | 'next';
export type DiffEntityKind = 'page' | 'component' | 'property';
export type DiffEntityStatus = 'pending';
export type DiffEventKind = 'add' | 'remove' | 'update' | 'reorder' | 'move' | 'rename' | 'remove+add';
export type DiffIdentitySource = 'explicit-id' | 'fallback-key' | 'structural-path' | 'none';
export type DiffFallbackMarker = 'none' | 'heuristic-pending' | 'remove-add-fallback';
export type DiffExplicitnessMarker = 'preserved' | 'not-applicable' | 'unknown' | 'absent-on-previous' | 'absent-on-next';
export type DiffPairingReason = 'deterministic-explicit-id' | 'deterministic-fallback-key' | 'deterministic-structural-path' | 'heuristic-similarity' | 'unpaired';
export type DiffFallbackConfidence = 'not-applicable' | 'high';

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

type DiffComponentNode = Record<string, unknown> & { __kind: string };
type DiffTreeBuild = {
  entity: DiffEntityResult;
  events: DiffEvent[];
  nextTraversalOrder: number;
};
type DiffCollectionCandidate = {
  item: unknown;
  path: string;
  index: number;
  collectionKey: string;
  /** Optional ownership domain for cross-owner forbidden-zone guard. Undefined == undefined is same. */
  ownerScope?: string;
};
type DiffPairedCandidate = {
  previous?: DiffCollectionCandidate;
  next?: DiffCollectionCandidate;
  pairingReason?: DiffPairingReason;
  fallbackMarker?: DiffFallbackMarker;
  fallbackConfidence?: DiffFallbackConfidence;
  /** Set when a heuristic candidate was rejected due to ambiguity. */
  ambiguityReason?: DiffAmbiguityReason;
  /** Type stub for M2-1 heuristicTrace: records forbidden-zone rejection. */
  heuristicRejected?: { rejectedBy: 'forbidden-zone' };
};
type DiffDeterministicIdentity = {
  entityKeySuffix: string;
  identitySource: DiffIdentitySource;
  pairingReason: DiffPairingReason;
};

const CHILD_COLLECTION_KEYS = ['components', 'fields', 'actions', 'items', 'children'] as const;
const FALLBACK_IDENTITY_KEYS = ['key', 'name', 'route', 'event', 'state', 'transition'] as const;

// -- Forbidden-zone guard (T-20260401-501 / M1-2) ----------------------------

/**
 * Returns the parent collection path of a candidate path by stripping the
 * trailing numeric index segment.
 * e.g. "/page/components/0/children/1" → "/page/components/0/children"
 */
function getCollectionParentPath(path: string): string {
  return path.replace(/\/\d+$/, '');
}

/**
 * Hard filter applied before heuristic scoring.
 * Returns false (reject) when the two candidates belong to different semantic
 * slots, different parent collection paths, or different owner scopes.
 * This is called for every (previous, next) pair inside selectHeuristicMatches.
 *
 * Exported for unit testing (HH-FZ series).
 */
export function isHeuristicAllowed(
  candidateA: DiffCollectionCandidate,
  candidateB: DiffCollectionCandidate
): boolean {
  // cross-semantic-slot: different collection keys
  if (candidateA.collectionKey !== candidateB.collectionKey) {
    return false;
  }
  // cross-parent: different parent collection path
  const parentA = getCollectionParentPath(candidateA.path);
  const parentB = getCollectionParentPath(candidateB.path);
  if (parentA !== parentB) {
    return false;
  }
  // cross-owner: ownerScope mismatch (undefined == undefined treated as same)
  if (candidateA.ownerScope !== candidateB.ownerScope) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------

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
  ambiguityReason?: DiffAmbiguityReason
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
    }
  };
}

function normalizeIdentityValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolvePageDeterministicIdentity(previous: DiffCompareDocument, next: DiffCompareDocument): DiffDeterministicIdentity {
  if (previous.page.id === next.page.id) {
    return {
      entityKeySuffix: previous.page.id,
      identitySource: 'explicit-id',
      pairingReason: 'deterministic-explicit-id'
    };
  }

  return {
    entityKeySuffix: '/page',
    identitySource: 'structural-path',
    pairingReason: 'deterministic-structural-path'
  };
}

function resolveComponentDeterministicIdentity(
  previousNode: DiffComponentNode | undefined,
  nextNode: DiffComponentNode | undefined,
  path: string
): DiffDeterministicIdentity {
  const previousKind = previousNode?.__kind;
  const nextKind = nextNode?.__kind;
  const kind = previousKind ?? nextKind ?? 'Unknown';

  const previousExplicitId = normalizeIdentityValue(previousNode?.id);
  const nextExplicitId = normalizeIdentityValue(nextNode?.id);
  if (previousExplicitId && nextExplicitId && previousExplicitId === nextExplicitId && previousKind === nextKind) {
    return {
      entityKeySuffix: `${kind}:${previousExplicitId}`,
      identitySource: 'explicit-id',
      pairingReason: 'deterministic-explicit-id'
    };
  }

  for (const key of FALLBACK_IDENTITY_KEYS) {
    const previousFallback = normalizeIdentityValue(previousNode?.[key]);
    const nextFallback = normalizeIdentityValue(nextNode?.[key]);
    if (previousFallback && nextFallback && previousFallback === nextFallback && previousKind === nextKind) {
      return {
        entityKeySuffix: `${kind}:${key}:${previousFallback}`,
        identitySource: 'fallback-key',
        pairingReason: 'deterministic-fallback-key'
      };
    }
  }

  if (previousKind === nextKind && previousKind) {
    return {
      entityKeySuffix: `${kind}:${path}`,
      identitySource: 'structural-path',
      pairingReason: 'deterministic-structural-path'
    };
  }

  return {
    entityKeySuffix: `${kind}:${path}`,
    identitySource: 'none',
    pairingReason: 'unpaired'
  };
}

function resolveSingleComponentAnchor(node: DiffComponentNode | undefined): string | undefined {
  if (!node) {
    return undefined;
  }

  const kind = node.__kind;
  const explicitId = normalizeIdentityValue(node.id);
  if (explicitId) {
    return `${kind}:explicit-id:${explicitId}`;
  }

  for (const key of FALLBACK_IDENTITY_KEYS) {
    const fallback = normalizeIdentityValue(node[key]);
    if (fallback) {
      return `${kind}:fallback-key:${key}:${fallback}`;
    }
  }

  return undefined;
}

function normalizeComparableScalar(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function collectComparableScalarMap(node: DiffComponentNode | undefined): Map<string, string> {
  const scalars = new Map<string, string>();
  if (!node) {
    return scalars;
  }

  for (const key of collectScalarPropertyKeys(node)) {
    const normalized = normalizeComparableScalar(node[key]);
    if (normalized) {
      scalars.set(key, normalized);
    }
  }

  return scalars;
}

function collectChildCollectionSignature(node: DiffComponentNode | undefined): string {
  if (!node) {
    return '';
  }

  return collectChildComponentLists(node)
    .map(entry => `${entry.key}:${entry.items.length}`)
    .sort()
    .join('|');
}

function scoreHeuristicSimilarity(
  previousCandidate: DiffCollectionCandidate,
  nextCandidate: DiffCollectionCandidate,
  policy: HeuristicPolicy
): number {
  if (previousCandidate.collectionKey !== nextCandidate.collectionKey) {
    return 0;
  }

  const previousNode = toComponentNode(previousCandidate.item);
  const nextNode = toComponentNode(nextCandidate.item);
  if (!previousNode || !nextNode || previousNode.__kind !== nextNode.__kind) {
    return 0;
  }

  if (resolveSingleComponentAnchor(previousNode) || resolveSingleComponentAnchor(nextNode)) {
    return 0;
  }

  const previousScalars = collectComparableScalarMap(previousNode);
  const nextScalars = collectComparableScalarMap(nextNode);
  let score = 0;

  for (const [key, value] of previousScalars.entries()) {
    if (nextScalars.get(key) === value) {
      score += policy.weightScalarExact;
    }
  }

  const previousSignature = collectChildCollectionSignature(previousNode);
  const nextSignature = collectChildCollectionSignature(nextNode);
  if (previousSignature.length > 0 && previousSignature === nextSignature) {
    score += policy.weightChildSignature;
  }

  if (previousScalars.size > 0 && previousScalars.size === nextScalars.size) {
    const previousKeys = [...previousScalars.keys()].sort().join('|');
    const nextKeys = [...nextScalars.keys()].sort().join('|');
    if (previousKeys === nextKeys) {
      score += policy.weightKeysetMatch;
    }
  }

  return score;
}

type HeuristicMatchResult = {
  matched: Array<{ previousIndex: number; nextIndex: number }>;
  ambiguous: Array<{ previousIndex: number; ambiguityReason: DiffAmbiguityReason }>;
};

/**
 * Select mutually-best heuristic pairs from two candidate lists.
 *
 * - Applies the forbidden-zone guard (isHeuristicAllowed) before scoring.
 * - Tracks ambiguous candidates (tie / multi-candidate / below-threshold) so
 *   callers can route them to remove+add rather than silent index pairing.
 * - Respects policy weights and thresholds.
 */
function selectHeuristicMatches(
  previousCandidates: DiffCollectionCandidate[],
  nextCandidates: DiffCollectionCandidate[],
  policy: HeuristicPolicy
): HeuristicMatchResult {
  const bestNextByPrevious = new Map<number, { nextIndex: number; score: number }>();
  const bestPreviousByNext = new Map<number, { previousIndex: number; score: number }>();
  const ambiguityByPrevious = new Map<number, DiffAmbiguityReason>();

  // Forward pass: for each previous, find best next
  for (let pi = 0; pi < previousCandidates.length; pi++) {
    let bestScore = 0;
    let bestNI = -1;
    let tied = false;

    for (let ni = 0; ni < nextCandidates.length; ni++) {
      if (!isHeuristicAllowed(previousCandidates[pi], nextCandidates[ni])) {
        continue; // hard block: forbidden-zone
      }
      const score = scoreHeuristicSimilarity(previousCandidates[pi], nextCandidates[ni], policy);
      if (score > bestScore) {
        bestScore = score;
        bestNI = ni;
        tied = false;
      } else if (score > 0 && score === bestScore) {
        tied = true;
      }
    }

    if (policy.rejectTie && tied) {
      ambiguityByPrevious.set(pi, 'tie-best-score');
    } else if (!tied && bestNI >= 0 && bestScore >= policy.minScore) {
      bestNextByPrevious.set(pi, { nextIndex: bestNI, score: bestScore });
    } else if (bestScore >= policy.weightScalarExact && bestScore < policy.minScore) {
      // below-threshold: candidate had at least one scalar-value match but fell short of
      // minScore. Only applies when minScore > weightScalarExact (e.g. custom policies).
      // Pure-structural matches (keyset only, score < weightScalarExact) are NOT flagged
      // here — they fall through to natural index pairing (structural-path) as before.
      ambiguityByPrevious.set(pi, 'below-threshold');
    }
    // Other cases: no scalar signal → not ambiguous, falls through to natural pairing
  }

  // Backward pass: for each next, find best previous
  for (let ni = 0; ni < nextCandidates.length; ni++) {
    let bestScore = 0;
    let bestPI = -1;
    let tied = false;

    for (let pi = 0; pi < previousCandidates.length; pi++) {
      if (!isHeuristicAllowed(previousCandidates[pi], nextCandidates[ni])) {
        continue;
      }
      const score = scoreHeuristicSimilarity(previousCandidates[pi], nextCandidates[ni], policy);
      if (score > bestScore) {
        bestScore = score;
        bestPI = pi;
        tied = false;
      } else if (score > 0 && score === bestScore) {
        tied = true;
      }
    }

    if (!tied && bestScore >= policy.minScore && bestPI >= 0) {
      bestPreviousByNext.set(ni, { previousIndex: bestPI, score: bestScore });
    }
  }

  // Mutual-best check
  const matched: Array<{ previousIndex: number; nextIndex: number }> = [];
  const ambiguous: Array<{ previousIndex: number; ambiguityReason: DiffAmbiguityReason }> = [];

  for (const [pi, nextMatch] of bestNextByPrevious.entries()) {
    if (!policy.requireMutualBest) {
      matched.push({ previousIndex: pi, nextIndex: nextMatch.nextIndex });
      continue;
    }
    const reverseMatch = bestPreviousByNext.get(nextMatch.nextIndex);
    if (reverseMatch?.previousIndex === pi) {
      matched.push({ previousIndex: pi, nextIndex: nextMatch.nextIndex });
    } else {
      // mutual check failed → multi-candidate ambiguity
      ambiguous.push({ previousIndex: pi, ambiguityReason: 'multi-candidate' });
    }
  }

  // Add tie / below-threshold ambiguities
  for (const [pi, reason] of ambiguityByPrevious.entries()) {
    ambiguous.push({ previousIndex: pi, ambiguityReason: reason });
  }

  return {
    matched: matched.sort((a, b) => a.previousIndex - b.previousIndex),
    ambiguous,
  };
}

function getPathIndex(path: string): number | undefined {
  const match = path.match(/\/(\d+)$/);
  return match ? Number(match[1]) : undefined;
}

function getParentPath(path: string): string {
  return path.replace(/\/[^/]+$/, '');
}

function resolveRenameClassification(
  previousNode: DiffComponentNode | undefined,
  nextNode: DiffComponentNode | undefined,
  identitySource: DiffIdentitySource
): DiffEventKind | undefined {
  if (identitySource !== 'explicit-id' || !previousNode || !nextNode || previousNode.__kind !== nextNode.__kind) {
    return undefined;
  }

  for (const key of FALLBACK_IDENTITY_KEYS) {
    const previousValue = normalizeIdentityValue(previousNode[key]);
    const nextValue = normalizeIdentityValue(nextNode[key]);
    if (previousValue && nextValue && previousValue !== nextValue) {
      return 'rename';
    }
  }

  return undefined;
}

function classifyComponentEventKind(
  previousNode: DiffComponentNode | undefined,
  nextNode: DiffComponentNode | undefined,
  previousPath: string,
  nextPath: string,
  identitySource: DiffIdentitySource,
  pairingReason: DiffPairingReason
): { kind: DiffEventKind; fallbackMarker: DiffFallbackMarker } {
  const hasPrevious = previousNode !== undefined;
  const hasNext = nextNode !== undefined;

  if (hasPrevious && !hasNext) {
    return { kind: 'remove', fallbackMarker: 'none' };
  }
  if (!hasPrevious && hasNext) {
    return { kind: 'add', fallbackMarker: 'none' };
  }
  if (!hasPrevious || !hasNext || previousNode.__kind !== nextNode.__kind || pairingReason === 'unpaired') {
    return { kind: 'remove+add', fallbackMarker: 'remove-add-fallback' };
  }

  const renameKind = resolveRenameClassification(previousNode, nextNode, identitySource);
  if (renameKind) {
    return { kind: renameKind, fallbackMarker: 'none' };
  }

  const previousParentPath = getParentPath(previousPath);
  const nextParentPath = getParentPath(nextPath);
  if (previousParentPath !== nextParentPath) {
    return { kind: 'move', fallbackMarker: 'none' };
  }

  const previousIndex = getPathIndex(previousPath);
  const nextIndex = getPathIndex(nextPath);
  if (previousIndex !== undefined && nextIndex !== undefined && previousIndex !== nextIndex) {
    return { kind: 'reorder', fallbackMarker: 'none' };
  }

  return { kind: 'update', fallbackMarker: 'none' };
}

function pairCollectionCandidates(
  previousCandidates: DiffCollectionCandidate[],
  nextCandidates: DiffCollectionCandidate[],
  policy: HeuristicPolicy = DEFAULT_HEURISTIC_POLICY
): DiffPairedCandidate[] {
  const paired: DiffPairedCandidate[] = [];
  const consumedPrevious = new Set<number>();
  const consumedNext = new Set<number>();
  const previousAnchorMap = new Map<string, number[]>();
  const nextAnchorMap = new Map<string, number[]>();

  for (let index = 0; index < previousCandidates.length; index++) {
    const anchor = resolveSingleComponentAnchor(toComponentNode(previousCandidates[index].item));
    if (!anchor) {
      continue;
    }
    const list = previousAnchorMap.get(anchor) ?? [];
    list.push(index);
    previousAnchorMap.set(anchor, list);
  }

  for (let index = 0; index < nextCandidates.length; index++) {
    const anchor = resolveSingleComponentAnchor(toComponentNode(nextCandidates[index].item));
    if (!anchor) {
      continue;
    }
    const list = nextAnchorMap.get(anchor) ?? [];
    list.push(index);
    nextAnchorMap.set(anchor, list);
  }

  for (const [anchor, previousIndexes] of previousAnchorMap.entries()) {
    const nextIndexes = nextAnchorMap.get(anchor);
    if (!nextIndexes || previousIndexes.length !== 1 || nextIndexes.length !== 1) {
      continue;
    }

    consumedPrevious.add(previousIndexes[0]);
    consumedNext.add(nextIndexes[0]);
    paired.push({
      previous: previousCandidates[previousIndexes[0]],
      next: nextCandidates[nextIndexes[0]]
    });
  }

  const remainingPrevious = previousCandidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(entry => !consumedPrevious.has(entry.index));
  const remainingNext = nextCandidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(entry => !consumedNext.has(entry.index));

  const heuristicResult = selectHeuristicMatches(
    remainingPrevious.map(entry => entry.candidate),
    remainingNext.map(entry => entry.candidate),
    policy
  );

  // Consume heuristic matches
  for (const heuristicMatch of heuristicResult.matched) {
    const previousIndex = remainingPrevious[heuristicMatch.previousIndex].index;
    const nextIndex = remainingNext[heuristicMatch.nextIndex].index;
    consumedPrevious.add(previousIndex);
    consumedNext.add(nextIndex);
    paired.push({
      previous: previousCandidates[previousIndex],
      next: nextCandidates[nextIndex],
      pairingReason: 'heuristic-similarity',
      fallbackMarker: 'heuristic-pending',
      fallbackConfidence: 'high'
    });
  }

  // Consume ambiguous candidates — route to remove+add instead of index pairing
  for (const ambiguousItem of heuristicResult.ambiguous) {
    const previousIndex = remainingPrevious[ambiguousItem.previousIndex].index;
    consumedPrevious.add(previousIndex);
    paired.push({
      previous: previousCandidates[previousIndex],
      next: undefined,
      pairingReason: 'unpaired',
      fallbackMarker: 'remove-add-fallback',
      ambiguityReason: ambiguousItem.ambiguityReason,
    });
  }

  const maxLength = Math.max(previousCandidates.length, nextCandidates.length);
  for (let index = 0; index < maxLength; index++) {
    const previousCandidate = index < previousCandidates.length && !consumedPrevious.has(index) ? previousCandidates[index] : undefined;
    const nextCandidate = index < nextCandidates.length && !consumedNext.has(index) ? nextCandidates[index] : undefined;

    if (!previousCandidate && !nextCandidate) {
      continue;
    }

    paired.push({
      previous: previousCandidate,
      next: nextCandidate
    });
  }

  return paired;
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
  const kind: DiffEventKind = hasPrevious && hasNext ? 'update' : hasPrevious ? 'remove' : 'add';
  const explicitness: DiffExplicitnessMarker = hasPrevious && hasNext
    ? 'preserved'
    : hasPrevious
      ? 'absent-on-next'
      : 'absent-on-previous';
  const event = createPendingEvent(
    `event:${entityKey}:${kind}`,
    kind,
    entityKey,
    'property',
    path,
    path,
    previous,
    next,
    hasPrevious,
    hasNext,
    'none',
    hasPrevious && hasNext ? 'deterministic-structural-path' : 'unpaired'
  );
  event.trace.explicitness = explicitness;
  const refs = buildEntityRefs('property', path, path, previous.page.id, next.page.id, hasPrevious, hasNext);

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
  policy: HeuristicPolicy = DEFAULT_HEURISTIC_POLICY
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
    ambiguityReason
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
      nextOrder
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
  for (const pairedCandidate of pairCollectionCandidates(previousCandidates, nextCandidates, policy)) {
    const childBuild = buildComponentEntity(
      pairedCandidate.previous?.item,
      pairedCandidate.next?.item,
      pairedCandidate.previous?.path ?? pairedCandidate.next?.path ?? `${previousPath}/components/0`,
      pairedCandidate.next?.path ?? pairedCandidate.previous?.path ?? `${nextPath}/components/0`,
      previous,
      next,
      nextOrder,
      pairedCandidate,
      policy
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
    effectivePolicy
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
      effectivePolicy
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
      policyHash: computePolicyHash(effectivePolicy),
    }
  };
}
