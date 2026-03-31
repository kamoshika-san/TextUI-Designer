/**
 * Normalize Degraded Path and Diagnostics Taxonomy (T-20260331-407, Epic K).
 *
 * Defines:
 *   - NormalizationDiagnosticEntry: typed diagnostic record for normalization failures
 *   - DegradePolicy: whether a failure is safe to recover from
 *   - classifyFailure(): maps NormalizeFailure.errorKind to DegradePolicy
 *   - toDiagnosticEntry(): converts NormalizeFailure to a NormalizationDiagnosticEntry
 *
 * This module has no coupling to compareUi internals — it is a pure policy module.
 * compareUi (T-406) imports from here.
 *
 * G3 connection (code comment):
 *   Error kind → partial diff capability:
 *     'intake-invalid'  → schema/structural partial diff may be feasible (recoverable)
 *     'rule-conflict'   → specific rule partial diff may be feasible (recoverable)
 *     'stage-error'     → non-deterministic failure, partial diff unsafe (non-recoverable)
 *     'unknown'         → non-deterministic failure, partial diff unsafe (non-recoverable)
 */

import type { NormalizeFailure } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NormalizationDiagnosticEntry {
  errorKind: 'intake-invalid' | 'stage-error' | 'unknown' | 'rule-conflict';
  severity: 'warning' | 'error';
  message: string;
  side: 'previous' | 'next';
  ruleId?: string;
}

export type DegradePolicy = 'recoverable' | 'non-recoverable';

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

/**
 * Classify a NormalizeFailure as recoverable or non-recoverable.
 *
 * - 'intake-invalid': input is structurally invalid but the validator accepted it;
 *   use the raw validated DSL and emit a warning. Recoverable.
 * - 'rule-conflict': a specific rule produced a conflict;
 *   the raw DSL is still usable. Recoverable.
 * - 'stage-error': a stage threw an unexpected error;
 *   non-deterministic — do not attempt partial diff. Non-recoverable.
 * - 'unknown': catch-all for failures without a known error kind. Non-recoverable.
 *
 * Note: 'stage-error' → non-recoverable is intentional.
 * Unknown stage failures are unsafe to skip because they may reflect
 * inconsistent intermediate DSL state.
 */
export function classifyFailure(failure: NormalizeFailure): DegradePolicy {
  switch (failure.errorKind) {
    case 'intake-invalid':
    case 'rule-conflict':
      return 'recoverable';
    case 'stage-error':
    case 'unknown':
      return 'non-recoverable';
    default: {
      // Exhaustive check: TypeScript will error if a new errorKind is added
      // to NormalizeFailure without updating this switch.
      const _exhaustive: never = failure.errorKind;
      void _exhaustive;
      return 'non-recoverable';
    }
  }
}

/**
 * Convert a NormalizeFailure into a structured NormalizationDiagnosticEntry.
 *
 * Severity rules:
 *   - recoverable failures → 'warning' (the diff can proceed with the raw DSL)
 *   - non-recoverable failures → 'error' (the diff cannot safely proceed)
 */
export function toDiagnosticEntry(
  failure: NormalizeFailure,
  side: 'previous' | 'next'
): NormalizationDiagnosticEntry {
  const policy = classifyFailure(failure);
  return {
    errorKind: failure.errorKind as NormalizationDiagnosticEntry['errorKind'],
    severity: policy === 'recoverable' ? 'warning' : 'error',
    message: failure.message,
    side,
    ruleId: undefined
  };
}
