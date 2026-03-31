/**
 * buildDiffCheckRunResult: CI gate signal computation from DiffResultExternal.
 *
 * Purpose (T-20260401-004, Epic L Sprint L2):
 *   Evaluate a DiffResultExternal against a policy configuration to produce a
 *   DiffCheckRunResult containing a pass/warn/fail signal, reasons, metrics,
 *   and an exit code controlled by strict/advisory mode.
 *
 * Signal rules (evaluated in priority order):
 *   1. s3-critical count > 0           → fail
 *   2. ambiguity count > threshold      → warn (advisory) / fail (strict)
 *   3. heuristic-only & no critical     → warn
 *   4. otherwise                        → pass
 *
 * Mode rules:
 *   - advisory: fail signals produce exitCode 0 (non-blocking)
 *   - strict:   fail signals produce exitCode 1 (blocking)
 *
 * Diagnostics (optional):
 *   Passed as an informational attachment only. Diagnostics do not re-drive
 *   the signal computation. All decisions come from DiffResultExternal fields.
 */

import type {
  DiffResultExternal,
  DiffExternalEvent,
} from '../../../core/textui-diff-result-external';

// -- Policy ------------------------------------------------------------------

export interface DiffCheckRunPolicy {
  /**
   * Threshold for ambiguity (heuristic-pending + remove-add-fallback) count
   * above which the signal escalates. Inclusive: count > threshold triggers.
   * Default: 0 (any ambiguity triggers escalation).
   */
  ambiguityThreshold?: number;
  /** Execution mode. Default: 'advisory'. */
  mode: 'strict' | 'advisory';
}

// -- Diagnostics attachment (informational only) -----------------------------

export interface DiffCheckRunDiagnostics {
  /** Optional summary counts passed for informational attachment only. */
  totalEvents?: number;
  heuristicCount?: number;
  fallbackCount?: number;
  [key: string]: unknown;
}

// -- Options -----------------------------------------------------------------

export interface BuildDiffCheckRunResultOpts {
  diagnostics?: DiffCheckRunDiagnostics;
  policy: DiffCheckRunPolicy;
}

// -- Result ------------------------------------------------------------------

export type DiffCheckSignal = 'pass' | 'warn' | 'fail';

export interface DiffCheckRunMetrics {
  totalEvents: number;
  criticalCount: number;
  ambiguityCount: number;
  heuristicOnlyCount: number;
  ambiguityThreshold: number;
}

export interface DiffCheckRunResult {
  kind: 'diff-check-run-result';
  signal: DiffCheckSignal;
  reasons: string[];
  metrics: DiffCheckRunMetrics;
  mode: 'strict' | 'advisory';
  exitCode: number;
}

// -- Internal helpers --------------------------------------------------------

function countCritical(events: DiffExternalEvent[]): number {
  // s3-critical events are those with fallbackMarker === 'remove-add-fallback'
  // or kind === 'remove+add'. These correspond to the entity-replaced / s3-critical
  // path defined in the review impact rules (textui-diff-review-impact.ts).
  return events.filter(
    e => e.fallbackMarker === 'remove-add-fallback' || e.kind === 'remove+add'
  ).length;
}

function countAmbiguity(events: DiffExternalEvent[]): number {
  // Ambiguity events carry any non-'none' fallbackMarker.
  return events.filter(e => e.fallbackMarker !== 'none').length;
}

function countHeuristicOnly(events: DiffExternalEvent[]): number {
  // Heuristic-only: pairingReason === 'heuristic-similarity' and not remove-add-fallback.
  return events.filter(
    e => e.pairingReason === 'heuristic-similarity' && e.fallbackMarker !== 'remove-add-fallback'
  ).length;
}

function resolveExitCode(signal: DiffCheckSignal, mode: 'strict' | 'advisory'): number {
  if (signal === 'fail' && mode === 'strict') {
    return 1;
  }
  return 0;
}

// -- Public API --------------------------------------------------------------

/**
 * Evaluate a DiffResultExternal and produce a CI gate result.
 *
 * @param external  Validated DiffResultExternal payload.
 * @param opts      Policy and optional informational diagnostics attachment.
 * @returns         DiffCheckRunResult with signal, reasons, metrics, mode, exitCode.
 */
export function buildDiffCheckRunResult(
  external: DiffResultExternal,
  opts: BuildDiffCheckRunResultOpts
): DiffCheckRunResult {
  const { policy } = opts;
  const mode = policy.mode;
  const ambiguityThreshold = policy.ambiguityThreshold ?? 0;

  const events = external.events;
  const totalEvents = events.length;
  const criticalCount = countCritical(events);
  const ambiguityCount = countAmbiguity(events);
  const heuristicOnlyCount = countHeuristicOnly(events);

  const metrics: DiffCheckRunMetrics = {
    totalEvents,
    criticalCount,
    ambiguityCount,
    heuristicOnlyCount,
    ambiguityThreshold,
  };

  const reasons: string[] = [];
  let signal: DiffCheckSignal = 'pass';

  // Rule 1: s3-critical > 0 → fail
  if (criticalCount > 0) {
    signal = 'fail';
    reasons.push(`${criticalCount} critical event(s) detected (remove+add or remove-add-fallback)`);
  }

  // Rule 2: ambiguity > threshold → escalate (warn in advisory, fail in strict)
  // Only applies when Rule 1 has not already set fail, but ambiguity may
  // coexist with critical — promote to fail if rule 1 already triggered.
  if (ambiguityCount > ambiguityThreshold) {
    if (signal !== 'fail') {
      // Not already failed — this rule decides
      signal = mode === 'strict' ? 'fail' : 'warn';
    }
    reasons.push(
      `ambiguity count ${ambiguityCount} exceeds threshold ${ambiguityThreshold}`
    );
  }

  // Rule 3: heuristic-only (no critical) → warn
  if (heuristicOnlyCount > 0 && criticalCount === 0 && signal === 'pass') {
    signal = 'warn';
    reasons.push(`${heuristicOnlyCount} heuristic-only event(s) present`);
  }

  // Rule 4: pass (no reasons = clean)
  if (signal === 'pass' && reasons.length === 0) {
    reasons.push('all events deterministic, no ambiguity or critical findings');
  }

  const exitCode = resolveExitCode(signal, mode);

  return {
    kind: 'diff-check-run-result',
    signal,
    reasons,
    metrics,
    mode,
    exitCode,
  };
}
