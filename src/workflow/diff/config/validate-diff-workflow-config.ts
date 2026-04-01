/**
 * validateDiffWorkflowConfig (T-20260401-008, Epic L Sprint L3)
 *
 * Validates a resolved DiffWorkflowConfig for axis/feature consistency.
 *
 * Consistency rules:
 *   - features.prComment is valid only when enablementAxis === 'pr-enabled'.
 *     If prComment is true with any other axis, it is silently disabled and a
 *     warning is recorded.
 *   - features.checkRunGate is valid when enablementAxis === 'ci-only' or
 *     'pr-enabled'.  If checkRunGate is true with 'local-only', it is silently
 *     disabled and a warning is recorded.
 *
 * No exceptions are thrown — all mismatches are recorded as warnings and the
 * config is returned with offending features forced to false.
 */

import type { DiffWorkflowConfig } from './load-diff-workflow-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidatedDiffWorkflowConfig {
  enablementAxis: DiffWorkflowConfig['enablementAxis'];
  mode: DiffWorkflowConfig['mode'];
  features: {
    prComment: boolean;
    checkRunGate: boolean;
  };
  /** Human-readable warnings produced during validation. Empty when valid. */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/**
 * Validate a resolved DiffWorkflowConfig against axis/feature consistency rules.
 *
 * @param config  Fully resolved DiffWorkflowConfig (output of resolveDiffWorkflowConfig).
 * @returns       ValidatedDiffWorkflowConfig with disabled features and warnings[] populated.
 */
export function validateDiffWorkflowConfig(config: DiffWorkflowConfig): ValidatedDiffWorkflowConfig {
  const warnings: string[] = [];
  let prComment = config.features.prComment;
  let checkRunGate = config.features.checkRunGate;

  // Rule: prComment requires pr-enabled axis.
  if (prComment && config.enablementAxis !== 'pr-enabled') {
    prComment = false;
    warnings.push(
      `features.prComment requires enablementAxis "pr-enabled" but axis is "${config.enablementAxis}"; prComment disabled`
    );
  }

  // Rule: checkRunGate requires ci-only or pr-enabled axis.
  if (checkRunGate && config.enablementAxis === 'local-only') {
    checkRunGate = false;
    warnings.push(
      `features.checkRunGate requires enablementAxis "ci-only" or "pr-enabled" but axis is "local-only"; checkRunGate disabled`
    );
  }

  return {
    enablementAxis: config.enablementAxis,
    mode: config.mode,
    features: {
      prComment,
      checkRunGate,
    },
    warnings,
  };
}
