/**
 * Semantic v2 canonical predicate v0.1 type definitions
 * Source: docs/future/semantic/semantic-meaning-core-ontology-v0-ja.md
 * Target boundary: design artifact only — do NOT import from src/
 */

/** The four permitted fact kinds in v0.1 */
export type FactKind = 'role' | 'entity_state' | 'availability' | 'action';

/** Atomic predicate: eq/ne — value is scalar or object matching the fact type */
export interface EqNePredicate {
  fact: FactKind;
  op: 'eq' | 'ne';
  value: unknown;
}

/** Atomic predicate: in — only valid for role / entity_state; value is deduped, asc-sorted string array */
export interface InPredicate {
  fact: 'role' | 'entity_state';
  op: 'in';
  value: string[];
}

/** Atomic predicate: exists — value field must be omitted */
export interface ExistsPredicate {
  fact: FactKind;
  op: 'exists';
}

/** Union of all atomic (leaf) predicate forms */
export type FactPredicate = EqNePredicate | InPredicate | ExistsPredicate;

/** Unresolved predicate leaf — used when a predicate cannot be determined at normalization time */
export interface UnresolvedPredicate {
  kind: 'unresolved';
  /** Short human-readable reason why this predicate is unresolved */
  reason: string;
  /** Optional candidate values; deduped, asc-sorted, max 8 entries */
  candidates?: string[];
}

/** Logical AND — all children must be satisfied */
export interface AllOfPredicate {
  all_of: CanonicalPredicate[];
}

/** Logical OR — at least one child must be satisfied */
export interface AnyOfPredicate {
  any_of: CanonicalPredicate[];
}

/** Logical NOT — exactly one child must NOT be satisfied */
export interface NotPredicate {
  not: CanonicalPredicate;
}

/** Union of all logical composition forms */
export type LogicalPredicate = AllOfPredicate | AnyOfPredicate | NotPredicate;

/**
 * Canonical predicate v0.1 — the complete union of all valid predicate forms.
 * Depth limit: max 4 from root. Empty arrays in all_of/any_of are invalid.
 * Single-element all_of/any_of must be collapsed to the child directly.
 */
export type CanonicalPredicate =
  | FactPredicate
  | LogicalPredicate
  | UnresolvedPredicate;
