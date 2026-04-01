import type { DiffSummaryImpactAxis } from '../textui-diff-review-impact';
import type {
  MergeConflict,
  ThreeWayConflictEvidence,
} from './types';

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

export interface ConflictTaxonomy {
  family: ConflictFamily;
  type: ConflictType;
  impactAxis: DiffSummaryImpactAxis;
  summaryKey: string;
  ruleTrace: string;
}

export interface ClassifiedMergeConflict extends MergeConflict {
  taxonomy: ConflictTaxonomy;
}

function hasKind(events: ThreeWayConflictEvidence[], kind: string): boolean {
  return events.some(event => event.kind === kind);
}

function hasHeuristic(events: ThreeWayConflictEvidence[]): boolean {
  return events.some(event => event.pairingReason === 'heuristic-similarity');
}

function hasDeterministic(events: ThreeWayConflictEvidence[]): boolean {
  return events.some(event => event.pairingReason !== 'heuristic-similarity');
}

function collectPaths(conflict: MergeConflict): string[] {
  return [...conflict.evidence.left, ...conflict.evidence.right]
    .flatMap(event => [
      event.previousSourceRef?.entityPath,
      event.nextSourceRef?.entityPath,
    ])
    .filter((value): value is string => typeof value === 'string');
}

function pathIncludesAny(paths: string[], needles: string[]): boolean {
  return needles.some(needle => paths.some(path => path.includes(needle)));
}

function classifyPermissionConflict(conflict: MergeConflict): ConflictTaxonomy | undefined {
  const paths = collectPaths(conflict);
  const touchesPermission = pathIncludesAny(paths, ['/permission', '/permissions', '/guards']);
  if (!touchesPermission) {
    return undefined;
  }

  const touchesTransition = pathIncludesAny(paths, ['/transition', '/transitions', '/state', '/states']);
  if (touchesTransition) {
    return {
      family: 'permission-conflict',
      type: 'permission-gate-vs-state-transition',
      impactAxis: 'permission',
      summaryKey: 'permission.conflict.gate-vs-state-transition',
      ruleTrace: 'permission path + state/transition path -> permission-gate-vs-state-transition / permission',
    };
  }

  const leftPaths = conflict.evidence.left.flatMap(event => [
    event.previousSourceRef?.entityPath,
    event.nextSourceRef?.entityPath,
  ]).filter((value): value is string => typeof value === 'string');
  const rightPaths = conflict.evidence.right.flatMap(event => [
    event.previousSourceRef?.entityPath,
    event.nextSourceRef?.entityPath,
  ]).filter((value): value is string => typeof value === 'string');

  const leftPermissionContexts = new Set(leftPaths.filter(path => path.includes('/permission') || path.includes('/permissions')));
  const rightPermissionContexts = new Set(rightPaths.filter(path => path.includes('/permission') || path.includes('/permissions')));
  const contextMismatch = leftPermissionContexts.size > 0
    && rightPermissionContexts.size > 0
    && [...leftPermissionContexts].every(path => !rightPermissionContexts.has(path));
  if (contextMismatch) {
    return {
      family: 'permission-conflict',
      type: 'permission-context-mismatch',
      impactAxis: 'permission',
      summaryKey: 'permission.conflict.context-mismatch',
      ruleTrace: 'permission paths differ across sides -> permission-context-mismatch / permission',
    };
  }

  return {
    family: 'permission-conflict',
    type: 'permission-tighten-vs-loosen',
    impactAxis: 'permission',
    summaryKey: 'permission.conflict.tighten-vs-loosen',
    ruleTrace: 'permission-only disagreement -> permission-tighten-vs-loosen / permission',
  };
}

function classifyStructuralConflict(conflict: MergeConflict): ConflictTaxonomy | undefined {
  const left = conflict.evidence.left;
  const right = conflict.evidence.right;

  if (hasKind(left, 'move') && hasKind(right, 'move')) {
    return {
      family: 'structural-conflict',
      type: 'same-entity-divergent-move',
      impactAxis: 'structure',
      summaryKey: 'structure.conflict.same-entity-divergent-move',
      ruleTrace: 'move on both sides -> same-entity-divergent-move / structure',
    };
  }

  if (hasKind(left, 'add') && hasKind(right, 'add')) {
    return {
      family: 'structural-conflict',
      type: 'same-slot-divergent-add',
      impactAxis: 'structure',
      summaryKey: 'structure.conflict.same-slot-divergent-add',
      ruleTrace: 'add on both sides -> same-slot-divergent-add / structure',
    };
  }

  if ((hasKind(left, 'reorder') && (hasKind(right, 'remove') || hasKind(right, 'remove+add')))
    || (hasKind(right, 'reorder') && (hasKind(left, 'remove') || hasKind(left, 'remove+add')))) {
    return {
      family: 'structural-conflict',
      type: 'reorder-vs-remove',
      impactAxis: 'structure',
      summaryKey: 'structure.conflict.reorder-vs-remove',
      ruleTrace: 'reorder combined with remove/remove+add -> reorder-vs-remove / structure',
    };
  }

  if ((hasKind(left, 'rename') && hasKind(right, 'remove+add'))
    || (hasKind(right, 'rename') && hasKind(left, 'remove+add'))
    || (hasKind(left, 'rename') && right.some(event => event.fallbackMarker === 'remove-add-fallback'))
    || (hasKind(right, 'rename') && left.some(event => event.fallbackMarker === 'remove-add-fallback'))) {
    return {
      family: 'structural-conflict',
      type: 'rename-vs-replace',
      impactAxis: 'structure',
      summaryKey: 'structure.conflict.rename-vs-replace',
      ruleTrace: 'rename combined with replace/remove+add -> rename-vs-replace / structure',
    };
  }

  return undefined;
}

function classifySemanticConflict(conflict: MergeConflict): ConflictTaxonomy {
  const left = conflict.evidence.left;
  const right = conflict.evidence.right;
  const paths = collectPaths(conflict);

  if ((hasHeuristic(left) && hasDeterministic(right)) || (hasHeuristic(right) && hasDeterministic(left))) {
    return {
      family: 'semantic-conflict',
      type: 'heuristic-vs-deterministic-disagreement',
      impactAxis: 'behavior',
      summaryKey: 'behavior.conflict.heuristic-vs-deterministic',
      ruleTrace: 'heuristic pairing on one side and deterministic pairing on the other -> heuristic-vs-deterministic-disagreement / behavior',
    };
  }

  const presentationPath = pathIncludesAny(paths, ['/label', '/variant', '/text', '/placeholder', '/title']);
  const behaviorPath = pathIncludesAny(paths, ['/action', '/actions', '/event', '/events', '/state', '/states', '/transition', '/transitions']);
  if (presentationPath && behaviorPath) {
    return {
      family: 'semantic-conflict',
      type: 'presentation-vs-behavior-escalation',
      impactAxis: 'behavior',
      summaryKey: 'behavior.conflict.presentation-vs-behavior-escalation',
      ruleTrace: 'presentation-oriented path combined with behavior-oriented path -> presentation-vs-behavior-escalation / behavior',
    };
  }

  return {
    family: 'semantic-conflict',
    type: 'same-property-different-value',
    impactAxis: conflict.entityKey.startsWith('property:') ? 'presentation' : 'behavior',
    summaryKey: conflict.entityKey.startsWith('property:')
      ? 'presentation.conflict.same-property-different-value'
      : 'behavior.conflict.same-property-different-value',
    ruleTrace: 'default conservative semantic conflict -> same-property-different-value',
  };
}

export function classifyConflict(conflict: MergeConflict): ClassifiedMergeConflict {
  const taxonomy = classifyPermissionConflict(conflict)
    ?? classifyStructuralConflict(conflict)
    ?? classifySemanticConflict(conflict);
  return {
    ...conflict,
    taxonomy,
  };
}

export function classifyConflicts(conflicts: MergeConflict[]): ClassifiedMergeConflict[] {
  return conflicts.map(classifyConflict);
}
