import type {
  DiffCompareSide,
  DiffEntityKind,
  DiffEventKind,
  DiffIdentitySource,
  DiffFallbackMarker,
  DiffExplicitnessMarker,
  DiffPairingReason,
  DiffFallbackConfidence,
  DiffHeuristicRejection,
  DiffHeuristicTrace,
  DiffCompareDocument,
  DiffAmbiguityReason,
  DiffTracePayload,
  DiffEvent,
  DiffEntityResult,
} from './diff-types';
import {
  type HeuristicPolicy,
  DEFAULT_HEURISTIC_POLICY,
  computePolicyHash,
} from './heuristic-policy';

export type DiffComponentNode = Record<string, unknown> & { __kind: string };
export type DiffCollectionCandidate = {
  item: unknown;
  path: string;
  index: number;
  collectionKey: string;
  /** Optional ownership domain for cross-owner forbidden-zone guard. Undefined == undefined is same. */
  ownerScope?: string;
};
export type DiffPairedCandidate = {
  previous?: DiffCollectionCandidate;
  next?: DiffCollectionCandidate;
  pairingReason?: DiffPairingReason;
  fallbackMarker?: DiffFallbackMarker;
  fallbackConfidence?: DiffFallbackConfidence;
  /** Set when a heuristic candidate was rejected due to ambiguity. */
  ambiguityReason?: DiffAmbiguityReason;
  heuristicTrace?: DiffHeuristicTrace;
};
export type DiffDeterministicIdentity = {
  entityKeySuffix: string;
  identitySource: DiffIdentitySource;
  pairingReason: DiffPairingReason;
};

export const CHILD_COLLECTION_KEYS = ['components', 'fields', 'actions', 'items', 'children'] as const;
export const FALLBACK_IDENTITY_KEYS = ['key', 'name', 'route', 'event', 'state', 'transition'] as const;

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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toComponentNode(component: unknown): DiffComponentNode | undefined {
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

export function normalizeIdentityValue(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function resolvePageDeterministicIdentity(previous: DiffCompareDocument, next: DiffCompareDocument): DiffDeterministicIdentity {
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

export function resolveComponentDeterministicIdentity(
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

type HeuristicScoreBreakdown = {
  totalScore: number;
  components: {
    scalarExact: number;
    childSignature: number;
    keysetMatch: number;
  };
};

function scoreHeuristicSimilarityDetailed(
  previousCandidate: DiffCollectionCandidate,
  nextCandidate: DiffCollectionCandidate,
  policy: HeuristicPolicy
): HeuristicScoreBreakdown {
  if (previousCandidate.collectionKey !== nextCandidate.collectionKey) {
    return {
      totalScore: 0,
      components: { scalarExact: 0, childSignature: 0, keysetMatch: 0 }
    };
  }

  const previousNode = toComponentNode(previousCandidate.item);
  const nextNode = toComponentNode(nextCandidate.item);
  if (!previousNode || !nextNode || previousNode.__kind !== nextNode.__kind) {
    return {
      totalScore: 0,
      components: { scalarExact: 0, childSignature: 0, keysetMatch: 0 }
    };
  }

  if (resolveSingleComponentAnchor(previousNode) || resolveSingleComponentAnchor(nextNode)) {
    return {
      totalScore: 0,
      components: { scalarExact: 0, childSignature: 0, keysetMatch: 0 }
    };
  }

  const previousScalars = collectComparableScalarMap(previousNode);
  const nextScalars = collectComparableScalarMap(nextNode);
  let scalarExact = 0;
  let childSignature = 0;
  let keysetMatch = 0;

  for (const [key, value] of previousScalars.entries()) {
    if (nextScalars.get(key) === value) {
      scalarExact += policy.weightScalarExact;
    }
  }

  const previousSignature = collectChildCollectionSignature(previousNode);
  const nextSignature = collectChildCollectionSignature(nextNode);
  if (previousSignature.length > 0 && previousSignature === nextSignature) {
    childSignature = policy.weightChildSignature;
  }

  if (previousScalars.size > 0 && previousScalars.size === nextScalars.size) {
    const previousKeys = [...previousScalars.keys()].sort().join('|');
    const nextKeys = [...nextScalars.keys()].sort().join('|');
    if (previousKeys === nextKeys) {
      keysetMatch = policy.weightKeysetMatch;
    }
  }

  return {
    totalScore: scalarExact + childSignature + keysetMatch,
    components: {
      scalarExact,
      childSignature,
      keysetMatch,
    }
  };
}

type HeuristicMatchResult = {
  matched: Array<{ previousIndex: number; nextIndex: number; score: HeuristicScoreBreakdown }>;
  ambiguous: Array<{
    previousIndex: number;
    ambiguityReason?: DiffAmbiguityReason;
    rejectedBy: DiffHeuristicRejection;
  }>;
};

function hasHeuristicSignalIgnoringGuard(
  previousCandidate: DiffCollectionCandidate,
  nextCandidate: DiffCollectionCandidate,
  policy: HeuristicPolicy
): boolean {
  const previousNode = toComponentNode(previousCandidate.item);
  const nextNode = toComponentNode(nextCandidate.item);
  if (!previousNode || !nextNode || previousNode.__kind !== nextNode.__kind) {
    return false;
  }
  if (resolveSingleComponentAnchor(previousNode) || resolveSingleComponentAnchor(nextNode)) {
    return false;
  }

  const signalCandidate: DiffCollectionCandidate = {
    ...previousCandidate,
    collectionKey: nextCandidate.collectionKey,
  };
  return scoreHeuristicSimilarityDetailed(signalCandidate, nextCandidate, policy).totalScore > 0;
}

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
  const bestNextByPrevious = new Map<number, { nextIndex: number; score: HeuristicScoreBreakdown }>();
  const bestPreviousByNext = new Map<number, { previousIndex: number; score: number }>();
  const ambiguityByPrevious = new Map<number, { ambiguityReason?: DiffAmbiguityReason; rejectedBy: DiffHeuristicRejection }>();

  // Forward pass: for each previous, find best next
  for (let pi = 0; pi < previousCandidates.length; pi++) {
    let bestScore = 0;
    let bestNI = -1;
    let tied = false;
    let bestBreakdown: HeuristicScoreBreakdown | undefined;
    let sawForbiddenZoneSignal = false;

    for (let ni = 0; ni < nextCandidates.length; ni++) {
      if (!isHeuristicAllowed(previousCandidates[pi], nextCandidates[ni])) {
        if (hasHeuristicSignalIgnoringGuard(previousCandidates[pi], nextCandidates[ni], policy)) {
          sawForbiddenZoneSignal = true;
        }
        continue; // hard block: forbidden-zone
      }
      const score = scoreHeuristicSimilarityDetailed(previousCandidates[pi], nextCandidates[ni], policy);
      if (score.totalScore > bestScore) {
        bestScore = score.totalScore;
        bestNI = ni;
        bestBreakdown = score;
        tied = false;
      } else if (score.totalScore > 0 && score.totalScore === bestScore) {
        tied = true;
      }
    }

    if (policy.rejectTie && tied) {
      ambiguityByPrevious.set(pi, { ambiguityReason: 'tie-best-score', rejectedBy: 'tie' });
    } else if (bestNI >= 0 && bestScore >= policy.minScore) {
      bestNextByPrevious.set(pi, { nextIndex: bestNI, score: bestBreakdown! });
    } else if (bestScore >= policy.weightScalarExact && bestScore < policy.minScore) {
      // below-threshold: candidate had at least one scalar-value match but fell short of
      // minScore. Only applies when minScore > weightScalarExact (e.g. custom policies).
      // Pure-structural matches (keyset only, score < weightScalarExact) are NOT flagged
      // here — they fall through to natural index pairing (structural-path) as before.
      ambiguityByPrevious.set(pi, { ambiguityReason: 'below-threshold', rejectedBy: 'threshold' });
    } else if (sawForbiddenZoneSignal) {
      ambiguityByPrevious.set(pi, { rejectedBy: 'forbidden-zone' });
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
      const score = scoreHeuristicSimilarityDetailed(previousCandidates[pi], nextCandidates[ni], policy).totalScore;
      if (score > bestScore) {
        bestScore = score;
        bestPI = pi;
        tied = false;
      } else if (score > 0 && score === bestScore) {
        tied = true;
      }
    }

    if (!(policy.rejectTie && tied) && bestScore >= policy.minScore && bestPI >= 0) {
      bestPreviousByNext.set(ni, { previousIndex: bestPI, score: bestScore });
    }
  }

  // Mutual-best check
  const matched: Array<{ previousIndex: number; nextIndex: number; score: HeuristicScoreBreakdown }> = [];
  const ambiguous: Array<{
    previousIndex: number;
    ambiguityReason?: DiffAmbiguityReason;
    rejectedBy: DiffHeuristicRejection;
  }> = [];

  for (const [pi, nextMatch] of bestNextByPrevious.entries()) {
    if (!policy.requireMutualBest) {
      matched.push({ previousIndex: pi, nextIndex: nextMatch.nextIndex, score: nextMatch.score });
      continue;
    }
    const reverseMatch = bestPreviousByNext.get(nextMatch.nextIndex);
    if (reverseMatch?.previousIndex === pi) {
      matched.push({ previousIndex: pi, nextIndex: nextMatch.nextIndex, score: nextMatch.score });
    } else {
      // mutual check failed → multi-candidate ambiguity
      ambiguous.push({ previousIndex: pi, ambiguityReason: 'multi-candidate', rejectedBy: 'tie' });
    }
  }

  // Add tie / below-threshold ambiguities
  for (const [pi, reason] of ambiguityByPrevious.entries()) {
    ambiguous.push({ previousIndex: pi, ambiguityReason: reason.ambiguityReason, rejectedBy: reason.rejectedBy });
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

export function classifyComponentEventKind(
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

export function pairCollectionCandidates(
  previousCandidates: DiffCollectionCandidate[],
  nextCandidates: DiffCollectionCandidate[],
  policy: HeuristicPolicy = DEFAULT_HEURISTIC_POLICY,
  policyHash: string = computePolicyHash(policy)
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
      fallbackConfidence: 'high',
      heuristicTrace: {
        attempted: true,
        accepted: true,
        totalScore: heuristicMatch.score.totalScore,
        minScore: policy.minScore,
        policyHash,
        components: heuristicMatch.score.components,
      }
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
      heuristicTrace: {
        attempted: true,
        accepted: false,
        minScore: policy.minScore,
        policyHash,
        rejectedBy: ambiguousItem.rejectedBy,
        ambiguityReason: ambiguousItem.ambiguityReason,
      }
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

export function collectChildComponentLists(node: DiffComponentNode | undefined): Array<{ key: string; items: unknown[] }> {
  if (!node) {
    return [];
  }

  return CHILD_COLLECTION_KEYS.flatMap(key => {
    const value = node[key];
    return Array.isArray(value) ? [{ key, items: value }] : [];
  });
}

export function collectScalarPropertyKeys(node: DiffComponentNode | undefined): string[] {
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

