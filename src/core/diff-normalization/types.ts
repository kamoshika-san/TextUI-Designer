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
 */
export interface NormalizationTrace {
  /** Map from entity path (e.g. "page.components[0]") to canonical key */
  entityPathMap: Record<string, string>;

  /**
   * Map from entity path to explicitness level.
   * "explicit" = value was set by author; "inferred" = filled in by normalizer.
   */
  explicitnessMap: Record<string, 'explicit' | 'inferred'>;

  /**
   * Map from entity path to ownership scope.
   * Captures which subsystem owns the boundary decision.
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
  errorKind: 'intake-invalid' | 'stage-error' | 'unknown';
  message: string;
  /** Partial trace up to the point of failure (may be undefined on very early failure) */
  trace?: Partial<NormalizationTrace>;
}

export type NormalizeResult = NormalizeSuccess | NormalizeFailure;
