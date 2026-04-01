import type { MergeConflict } from './types';

export interface MergePolicyDecision {
  decision: 'auto-merge-safe' | 'manual-review-required';
  reason:
    | 'non-overlap'
    | 'commutative-reorder'
    | 'one-side-noop'
    | 'heuristic-excluded'
    | 'permission-excluded'
    | 'ambiguous-dependency';
  ruleTrace: string;
}

function isHeuristicConflict(conflict: MergeConflict): boolean {
  const sides = [conflict.evidence.base, conflict.evidence.left, conflict.evidence.right];
  return sides.some(side => side !== undefined && side !== null && side.pairingReason === 'heuristic-similarity');
}

function isPermissionSensitive(conflict: MergeConflict): boolean {
  return conflict.taxonomy.family === 'permission-conflict'
    || conflict.taxonomy.impactAxis === 'permission';
}

function isReorderOnly(conflict: MergeConflict): boolean {
  return conflict.evidence.left.eventKind === 'reorder'
    && conflict.evidence.right.eventKind === 'reorder';
}

function normalizeCollectionPath(path?: string): string | undefined {
  if (!path) {
    return undefined;
  }
  return path.replace(/\/\d+(?=\/|$)/g, '');
}

function pathDependsOn(otherPath: string | undefined, ownPath: string | undefined): boolean {
  if (!otherPath || !ownPath) {
    return false;
  }
  return otherPath.startsWith(ownPath) || ownPath.startsWith(otherPath);
}

function hasDependencyEdge(conflict: MergeConflict): boolean {
  const leftPath = normalizeCollectionPath(conflict.evidence.left.path);
  const rightPath = normalizeCollectionPath(conflict.evidence.right.path);
  if (leftPath && rightPath && leftPath === rightPath) {
    return false;
  }
  return pathDependsOn(leftPath, rightPath);
}

export function evaluateMergeConflictPolicy(conflict: MergeConflict): MergePolicyDecision {
  if (isHeuristicConflict(conflict)) {
    return {
      decision: 'manual-review-required',
      reason: 'heuristic-excluded',
      ruleTrace: 'heuristic pairing detected in evidence -> manual-review-required',
    };
  }

  if (isPermissionSensitive(conflict)) {
    return {
      decision: 'manual-review-required',
      reason: 'permission-excluded',
      ruleTrace: 'permission-sensitive taxonomy or impact axis -> manual-review-required',
    };
  }

  if (conflict.resolutionHint === 'auto-merge-safe') {
    return {
      decision: 'auto-merge-safe',
      reason: 'one-side-noop',
      ruleTrace: 'conflict payload already marked auto-merge-safe -> one-side-noop lane',
    };
  }

  if (isReorderOnly(conflict) && !hasDependencyEdge(conflict)) {
    return {
      decision: 'auto-merge-safe',
      reason: 'commutative-reorder',
      ruleTrace: 'reorder-only conflict without dependency edge -> auto-merge-safe',
    };
  }

  if (!hasDependencyEdge(conflict) && conflict.evidence.left.path && conflict.evidence.right.path) {
    return {
      decision: 'auto-merge-safe',
      reason: 'non-overlap',
      ruleTrace: 'distinct conflict paths without dependency edge -> auto-merge-safe',
    };
  }

  return {
    decision: 'manual-review-required',
    reason: 'ambiguous-dependency',
    ruleTrace: 'dependency edge present or path evidence insufficient -> manual-review-required',
  };
}

export function evaluateMergePolicy(conflicts: MergeConflict[]): MergePolicyDecision[] {
  return conflicts.map(evaluateMergeConflictPolicy);
}
