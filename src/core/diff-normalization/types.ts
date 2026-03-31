/**
 * Shared type definitions for the diff-normalization subsystem (Epic K).
 *
 * Stage0 through Stage3 all share these types. The trace is threaded through
 * each stage so downstream consumers (compareUi, diagnostics) get full
 * provenance even when earlier stages were skipped due to degraded mode.
 */

import type { TextUIDSL } from '../../domain/dsl-types';

// ---------------------------------------------------------------------------
// Trace
// ---------------------------------------------------------------------------

/**
 * NormalizationTrace carries provenance accumulated across all stages.
 * Each stage appends to appliedRules and may populate the maps.
 *
 * Invariants (enforced by tests in normalize-trace-invariants.test.*):
 *   1. entityPathMap — entity paths for components that carry a sourceRef surrogate
 *      (currently `token`) are recorded. Downstream consumers can use this map to
 *      reverse-look up the original entity path after normalization renames/reorders.
 *   2. explicitnessMap — once set to 'explicit' by stage0, a path must NOT be
 *      downgraded to 'inferred' by later stages. Normalization may add 'inferred'
 *      entries for fields it fills in, but must not overwrite author-set 'explicit' values.
 *   3. ownershipMap — every component path that participates in normalization must
 *      have an ownershipMap entry identifying which subsystem owns its boundary decision.
 *
 * @note Vocabulary: current implementation uses 'explicit' | 'inferred' for explicitnessMap.
 * T-20260331-405 task spec uses a different vocabulary ('absent-on-input' | 'preserved' |
 * 'added-by-normalization'). These are equivalent in intent but not in naming.
 * If the spec vocabulary is adopted, explicitnessMap type must be updated and all stage
 * implementations must be updated in the same commit to avoid TypeScript errors.
 */
export interface NormalizationTrace {
  /**
   * Map from entity path (e.g. "page.components[0]") to canonical key (e.g. token value).
   * Populated by Stage0 for components that carry a `token` field (sourceRef surrogate).
   * Used by downstream consumers to reverse-look up original entity paths.
   */
  entityPathMap: Record<string, string>;

  /**
   * Map from entity path to explicitness level.
   * - "explicit": value was set by the DSL author and must not be overwritten by normalization.
   * - "inferred": value was filled in by the normalizer (absent in the original DSL).
   *
   * Invariant: a path that is 'explicit' in Stage0 must remain 'explicit' after Stage1–3.
   */
  explicitnessMap: Record<string, 'explicit' | 'inferred'>;

  /**
   * Map from entity path to ownership scope (e.g. 'page-boundary', 'stage1-structural').
   * Identifies which subsystem owns the boundary decision for that entity.
   * Stage3 fills gaps for any component path not covered by earlier stages.
   */
  ownershipMap: Record<string, string>;

  /** Ordered list of rules applied, e.g. ['stage0-intake-check', 'stage1-sort-children'] */
  appliedRules: string[];

  /** Non-fatal warnings accumulated during normalization */
  warnings: NormalizeWarning[];
}

export function emptyTrace(): NormalizationTrace {
  return {
    entityPathMap: {},
    explicitnessMap: {},
    ownershipMap: {},
    appliedRules: [],
    warnings: []
  };
}

// ---------------------------------------------------------------------------
// Warning
// ---------------------------------------------------------------------------

export interface NormalizeWarning {
  path: string;
  message: string;
  ruleId?: string;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface NormalizeOptions {
  /**
   * Allowlist of rule IDs that may be applied.
   * When undefined, the default allowlist for each stage is used.
   * Pass an empty array to disable all optional rules (intake-check rules still run).
   */
  allowedRules?: string[];

  /**
   * When true, failures do not abort the pipeline — a degraded result is
   * produced instead. Default: false.
   */
  degradeOnFailure?: boolean;
}

// ---------------------------------------------------------------------------
// Result union
// ---------------------------------------------------------------------------

export interface NormalizeSuccess {
  ok: true;
  dsl: TextUIDSL;
  trace: NormalizationTrace;
}

export interface NormalizeFailure {
  ok: false;
  errorKind: 'intake-invalid' | 'stage-error' | 'unknown' | 'rule-conflict';
  message: string;
  /** Partial trace up to the point of failure (may be undefined on very early failure) */
  trace?: Partial<NormalizationTrace>;
}

export type NormalizeResult = NormalizeSuccess | NormalizeFailure;
