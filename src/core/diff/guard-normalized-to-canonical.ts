/**
 * Maps DSL guard normalization output (v2-diff-component-scan shape) to CanonicalPredicate v0.1.
 * Facts outside ontology FactKind become UnresolvedPredicate leaves.
 */

import type { CanonicalPredicate, FactKind } from './canonical-predicate';

const V01_FACTS: ReadonlySet<FactKind> = new Set(['role', 'entity_state', 'availability', 'action']);

export type NormalizedGuardUnresolved = {
  kind: 'unresolved';
  reason: string;
  candidates?: string[];
};

export type NormalizedGuardAtomic = {
  op: 'eq' | 'ne' | 'in' | 'exists';
  fact: string;
  value?: string | number | boolean;
};

export type NormalizedGuardLogical =
  | { op: 'all_of'; all_of: NormalizedGuardNode[] }
  | { op: 'any_of'; any_of: NormalizedGuardNode[] }
  | { op: 'not'; not: NormalizedGuardNode };

export type NormalizedGuardNode =
  | NormalizedGuardUnresolved
  | NormalizedGuardAtomic
  | NormalizedGuardLogical;

function isFactKind(fact: string): fact is FactKind {
  return V01_FACTS.has(fact as FactKind);
}

function atomicToCanonical(atom: NormalizedGuardAtomic): CanonicalPredicate {
  if (atom.op === 'exists') {
    if (!isFactKind(atom.fact)) {
      return {
        kind: 'unresolved',
        reason: 'guard_fact_not_in_v0_ontology',
        candidates: [atom.fact].slice(0, 8),
      };
    }
    return { fact: atom.fact, op: 'exists' };
  }

  if (atom.op === 'in') {
    if (atom.fact !== 'role' && atom.fact !== 'entity_state') {
      return {
        kind: 'unresolved',
        reason: 'guard_in_requires_role_or_entity_state',
        candidates: [atom.fact].slice(0, 8),
      };
    }
    if (typeof atom.value !== 'string') {
      return { kind: 'unresolved', reason: 'guard_in_requires_string_value' };
    }
    return { fact: atom.fact, op: 'in', value: [atom.value] };
  }

  if (atom.op === 'eq' || atom.op === 'ne') {
    if (!isFactKind(atom.fact)) {
      return {
        kind: 'unresolved',
        reason: 'guard_fact_not_in_v0_ontology',
        candidates: [atom.fact].slice(0, 8),
      };
    }
    return { fact: atom.fact, op: atom.op, value: atom.value };
  }

  return { kind: 'unresolved', reason: 'guard_unknown_atomic_op' };
}

export function normalizedGuardToCanonical(guard: NormalizedGuardNode): CanonicalPredicate {
  if ('kind' in guard && guard.kind === 'unresolved') {
    return {
      kind: 'unresolved',
      reason: guard.reason,
      ...(guard.candidates && guard.candidates.length > 0 ? { candidates: guard.candidates.slice(0, 8) } : {}),
    };
  }

  if ('op' in guard) {
    if (guard.op === 'all_of') {
      return { op: 'all_of', all_of: guard.all_of.map(normalizedGuardToCanonical) };
    }
    if (guard.op === 'any_of') {
      return { op: 'any_of', any_of: guard.any_of.map(normalizedGuardToCanonical) };
    }
    if (guard.op === 'not') {
      return { op: 'not', not: normalizedGuardToCanonical(guard.not) };
    }
    return atomicToCanonical(guard);
  }

  return { kind: 'unresolved', reason: 'guard_invalid_shape' };
}
