/**
 * Public normalize() API for the diff-normalization subsystem.
 *
 * Chains Stage0 → Stage1 → Stage2 → Stage3 into a single call.
 * Stage0 and Stage3 always run.
 * Stage1 and Stage2 respect opts.allowedRules.
 *
 * On failure at any stage, returns NormalizeFailure with the partial trace
 * accumulated up to the point of failure.
 */

import type { TextUIDSL } from '../../domain/dsl-types';
import type { NormalizeOptions, NormalizeResult } from './types';
import { runStage0Intake } from './stage0-intake';
import { runStage1Structural } from './stage1-structural';
import { runStage2Value } from './stage2-value';
import { runStage3Finalize } from './stage3-finalize';

/**
 * Normalize a TextUIDSL through all four stages.
 *
 * @param dsl   Input DSL (not mutated).
 * @param opts  Optional: allowedRules forwarded to Stage1/Stage2.
 *              Stage0 and Stage3 are always-on and ignore allowedRules.
 *
 * @returns NormalizeSuccess with the fully normalized DSL and complete trace,
 *          or NormalizeFailure with errorKind and the partial trace.
 */
export function normalize(
  dsl: TextUIDSL,
  opts?: NormalizeOptions
): NormalizeResult {
  // Stage0 — intake check (always-on; has its own trace bootstrap)
  const s0 = runStage0Intake(dsl, opts);
  if (!s0.ok) {
    return s0; // NormalizeFailure with partial trace from Stage0
  }

  // Stage1 — structural canonicalization
  let s1Result;
  try {
    s1Result = runStage1Structural(s0.dsl, s0.trace, opts?.allowedRules);
  } catch (err) {
    return {
      ok: false,
      errorKind: 'stage-error',
      message: `Stage1 error: ${err instanceof Error ? err.message : String(err)}`,
      trace: s0.trace
    };
  }

  // Stage2 — value equivalence canonicalization
  let s2Result;
  try {
    s2Result = runStage2Value(s1Result.dsl, s1Result.trace, opts?.allowedRules);
  } catch (err) {
    return {
      ok: false,
      errorKind: 'stage-error',
      message: `Stage2 error: ${err instanceof Error ? err.message : String(err)}`,
      trace: s1Result.trace
    };
  }

  // Stage3 — finalize (always-on; completes the trace)
  let s3Result;
  try {
    s3Result = runStage3Finalize(s2Result.dsl, s2Result.trace);
  } catch (err) {
    return {
      ok: false,
      errorKind: 'stage-error',
      message: `Stage3 error: ${err instanceof Error ? err.message : String(err)}`,
      trace: s2Result.trace
    };
  }

  return {
    ok: true,
    dsl: s3Result.dsl,
    trace: s3Result.trace
  };
}
