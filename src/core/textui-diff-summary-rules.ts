/**
 * D2-2: Summary rule layer for state / event / transition / permission domains.
 *
 * This module implements the domain-specific summary rules that refine the
 * conservative baseline produced by D2-1 (`classifyReviewImpact`). Rules use
 * the Epic A reserved extension hook context when it is present and fall back
 * to D2-1 defaults when hooks are absent.
 *
 * Design guardrails (enforced by type):
 * - Rules must not read raw DSL text. Inputs are structural hook values only.
 * - Rules must not reinvent category semantics beyond the fixed vocabulary in
 *   docs/diff-summary-event-vocabulary.md.
 * - Rules that cannot determine a clear domain signal must return null so the
 *   caller preserves the D2-1 baseline instead of inventing a weaker guess.
 */

import type { DiffEntityKind } from './textui-core-diff';
import type {
  DiffSummaryCategory,
  DiffSummarySeverity,
  DiffSummaryImpactAxis,
  DiffReviewImpact,
} from './textui-diff-review-impact';

// -- Extension hook context --------------------------------------------------
//
// These types mirror the reserved hooks documented in
// docs/diff-ir-extension-points.md. They are optional because the extraction
// layer does not populate them today — they are "reserved" per Epic A Sprint A3.
// When population arrives, it must match these shapes.

/** Reserved state-level extension hooks (Epic A §1). */
export interface DiffStateHookContext {
  /**
   * Lifecycle category for the state. Example values: 'ui-mode',
   * 'validation', 'permission-conditioned', 'lifecycle'.
   */
  stateCategory?: string;
  /**
   * Structured activation trigger identity. Absent means the activation
   * description was not stable enough to normalize.
   */
  activationRef?: string;
  /** True when a permission context constrains this state's activation. */
  permissionContextPresent?: boolean;
}

/** Reserved event-level extension hooks (Epic A §2). */
export interface DiffEventHookContext {
  /** Lifecycle phase or dispatch stage. */
  eventPhase?: string;
  /** Stable linkage identity between authored event and consumers. */
  eventRef?: string;
  /** True when structured preconditions exist on this event. */
  hasGuards?: boolean;
}

/** Reserved transition-level extension hooks (Epic A §3). */
export interface DiffTransitionHookContext {
  /**
   * Transition kind. Example values: 'navigation', 'modal-open',
   * 'tab-switch', 'async-branch', 'permission-gate'.
   */
  transitionKind?: string;
  /** True when downstream transition effects exist. */
  hasEffects?: boolean;
  /** True when a structured guard detail reference is present. */
  hasGuardDetail?: boolean;
}

/** Reserved permission-level extension hooks (Epic A §4). */
export interface DiffPermissionHookContext {
  /** Present on any owning unit whose access is permission-constrained. */
  permissionContextRef?: string;
  /**
   * Categorised effect kind. Example values: 'hidden', 'disabled',
   * 'readonly', 'gated-transition', 'state-limited'.
   */
  permissionEffectKind?: string;
}

/**
 * Aggregated extension hook context for one diff event.
 *
 * Callers should populate only the sub-object that matches the owning unit
 * type. Missing sub-objects mean the hook is absent for that event.
 */
export interface DiffExtensionHookContext {
  state?: DiffStateHookContext;
  event?: DiffEventHookContext;
  transition?: DiffTransitionHookContext;
  permission?: DiffPermissionHookContext;
}

// -- Rule output -------------------------------------------------------------

/**
 * A refined classification returned by a domain rule. A rule that cannot
 * produce a confident refinement should return null to preserve the D2-1
 * baseline.
 */
export interface DiffSummaryRuleRefinement {
  category: DiffSummaryCategory;
  severity: DiffSummarySeverity;
  impactAxis: DiffSummaryImpactAxis;
  summaryKey: string;
  ruleTrace: string;
}

// -- Domain-specific rule functions ------------------------------------------

/**
 * State hook rule.
 *
 * Refines when stateCategory signals a permission-conditioned state (->
 * permission-update) or a lifecycle/mode change (-> behavior-update).
 */
function applyStateRule(
  baseImpact: DiffReviewImpact,
  ctx: DiffStateHookContext,
): DiffSummaryRuleRefinement | null {
  // Permission-conditioned state changes are permission-update territory
  if (ctx.permissionContextPresent || ctx.stateCategory === 'permission-conditioned') {
    return {
      category: 'permission-update',
      severity: 's2-review',
      impactAxis: 'permission',
      summaryKey: 'permission.state-activation.permission-conditioned',
      ruleTrace: `state hook: permissionContextPresent=${ctx.permissionContextPresent} stateCategory=${ctx.stateCategory} -> permission-update / s2-review`,
    };
  }
  // Lifecycle or UI-mode state: stay behavior-update but use state axis
  if (ctx.stateCategory === 'lifecycle' || ctx.stateCategory === 'ui-mode' || ctx.stateCategory === 'validation') {
    const severity: DiffSummarySeverity = baseImpact.heuristicDerived ? 's3-critical' : 's2-review';
    return {
      category: 'behavior-update',
      severity,
      impactAxis: 'state',
      summaryKey: `behavior.state.${ctx.stateCategory ?? 'update'}`,
      ruleTrace: `state hook: stateCategory=${ctx.stateCategory} -> behavior-update / ${severity} / state`,
    };
  }
  return null;
}

/**
 * Event hook rule.
 *
 * Refines when eventPhase or guard presence signals meaningful event semantics.
 */
function applyEventRule(
  baseImpact: DiffReviewImpact,
  ctx: DiffEventHookContext,
): DiffSummaryRuleRefinement | null {
  if (ctx.hasGuards) {
    const severity: DiffSummarySeverity = baseImpact.heuristicDerived ? 's3-critical' : 's2-review';
    return {
      category: 'behavior-update',
      severity,
      impactAxis: 'event',
      summaryKey: 'behavior.event.guard-changed',
      ruleTrace: `event hook: hasGuards=true -> behavior-update / ${severity} / event`,
    };
  }
  if (ctx.eventPhase !== undefined) {
    return {
      category: 'behavior-update',
      severity: 's2-review',
      impactAxis: 'event',
      summaryKey: `behavior.event.phase-${ctx.eventPhase ?? 'changed'}`,
      ruleTrace: `event hook: eventPhase=${ctx.eventPhase} -> behavior-update / s2-review / event`,
    };
  }
  return null;
}

/**
 * Transition hook rule.
 *
 * Permission-gated transitions -> permission-update.
 * Other transition kinds -> behavior-update / flow.
 */
function applyTransitionRule(
  baseImpact: DiffReviewImpact,
  ctx: DiffTransitionHookContext,
): DiffSummaryRuleRefinement | null {
  if (ctx.transitionKind === 'permission-gate') {
    return {
      category: 'permission-update',
      severity: 's2-review',
      impactAxis: 'permission',
      summaryKey: 'permission.transition.gated',
      ruleTrace: 'transition hook: transitionKind=permission-gate -> permission-update / s2-review / permission',
    };
  }
  if (ctx.transitionKind !== undefined) {
    const severity: DiffSummarySeverity = baseImpact.heuristicDerived ? 's3-critical' : 's2-review';
    return {
      category: 'behavior-update',
      severity,
      impactAxis: 'flow',
      summaryKey: `behavior.transition.${ctx.transitionKind}`,
      ruleTrace: `transition hook: transitionKind=${ctx.transitionKind} -> behavior-update / ${severity} / flow`,
    };
  }
  if (ctx.hasEffects || ctx.hasGuardDetail) {
    return {
      category: 'behavior-update',
      severity: 's2-review',
      impactAxis: 'flow',
      summaryKey: 'behavior.transition.effects-or-guard',
      ruleTrace: `transition hook: hasEffects=${ctx.hasEffects} hasGuardDetail=${ctx.hasGuardDetail} -> behavior-update / s2-review / flow`,
    };
  }
  return null;
}

/**
 * Permission hook rule.
 *
 * Takes priority over structural hooks when permissionContextRef or
 * permissionEffectKind are present on any owning unit.
 */
function applyPermissionRule(
  _baseImpact: DiffReviewImpact,
  ctx: DiffPermissionHookContext,
): DiffSummaryRuleRefinement | null {
  if (ctx.permissionContextRef === undefined && ctx.permissionEffectKind === undefined) {
    return null;
  }
  // Major flow block/unblock elevates to critical
  const blockingEffects = ['gated-transition', 'state-limited'];
  const isBlockingEffect = ctx.permissionEffectKind !== undefined &&
    blockingEffects.includes(ctx.permissionEffectKind);

  const severity: DiffSummarySeverity = isBlockingEffect ? 's3-critical' : 's2-review';
  const key = ctx.permissionEffectKind
    ? `permission.effect.${ctx.permissionEffectKind}`
    : 'permission.context.changed';

  return {
    category: 'permission-update',
    severity,
    impactAxis: 'permission',
    summaryKey: key,
    ruleTrace: `permission hook: permissionEffectKind=${ctx.permissionEffectKind} permissionContextRef=${ctx.permissionContextRef !== undefined} -> permission-update / ${severity}`,
  };
}

// -- Rule application guardrails ---------------------------------------------

/**
 * Validate that a rule refinement does not weaken a conservative D2-1 result.
 *
 * A rule may NOT:
 * - convert entity-replaced / ambiguity-warning into a softer category
 * - downgrade severity when ambiguityMarker is set
 *
 * These guardrails ensure extension hooks cannot hide conservative structural
 * outcomes behind domain-specific framing.
 */
function isRefinementAllowed(
  base: DiffReviewImpact,
  refinement: DiffSummaryRuleRefinement,
): boolean {
  // Never override conservative fallback categories
  if (base.category === 'entity-replaced' || base.category === 'ambiguity-warning') {
    return false;
  }
  // Never downgrade when ambiguity marker is present
  const baseSeverityRank: Record<DiffSummarySeverity, number> = {
    's0-minor': 0, 's1-notice': 1, 's2-review': 2, 's3-critical': 3,
  };
  if (base.ambiguityMarker && baseSeverityRank[refinement.severity] < baseSeverityRank[base.severity]) {
    return false;
  }
  return true;
}

// -- Public API --------------------------------------------------------------

/**
 * Apply domain summary rules to a D2-1 base impact.
 *
 * Permission hooks take priority over structural hooks. Within structural hooks,
 * rules are checked in this order: permission -> transition -> state -> event.
 *
 * Returns the base impact unchanged when no hook context is available or when
 * all applicable rules are blocked by the guardrail.
 */
export function applySummaryRule(
  baseImpact: DiffReviewImpact,
  hookContext?: DiffExtensionHookContext,
): DiffReviewImpact {
  if (hookContext === undefined) { return baseImpact; }

  let refinement: DiffSummaryRuleRefinement | null = null;

  // Permission hooks take priority across all owning unit types
  if (hookContext.permission !== undefined && refinement === null) {
    refinement = applyPermissionRule(baseImpact, hookContext.permission);
  }
  if (hookContext.transition !== undefined && refinement === null) {
    refinement = applyTransitionRule(baseImpact, hookContext.transition);
  }
  if (hookContext.state !== undefined && refinement === null) {
    refinement = applyStateRule(baseImpact, hookContext.state);
  }
  if (hookContext.event !== undefined && refinement === null) {
    refinement = applyEventRule(baseImpact, hookContext.event);
  }

  if (refinement === null) { return baseImpact; }
  if (!isRefinementAllowed(baseImpact, refinement)) { return baseImpact; }

  return {
    ...baseImpact,
    category: refinement.category,
    severity: refinement.severity,
    impactAxis: refinement.impactAxis,
    summaryKey: refinement.summaryKey,
    groupHint: refinement.impactAxis,
    ruleTrace: `${baseImpact.ruleTrace} | rule-refined: ${refinement.ruleTrace}`,
  };
}

/**
 * Apply summary rules to all impacts in a batch, given a parallel array of
 * optional extension hook contexts.
 *
 * `hookContexts[i]` applies to `baseImpacts[i]`. Pass undefined entries for
 * events that have no extension hook context.
 */
export function applySummaryRules(
  baseImpacts: DiffReviewImpact[],
  hookContexts: (DiffExtensionHookContext | undefined)[],
): DiffReviewImpact[] {
  return baseImpacts.map((impact, i) => applySummaryRule(impact, hookContexts[i]));
}

/**
 * Build an empty hook context array of the same length as the impact array.
 *
 * Use this when no extension hook data is available yet. Rules will fall back
 * to D2-1 defaults for every event.
 */
export function emptyHookContexts(length: number): undefined[] {
  return Array.from({ length });
}

// -- Re-export for downstream consumers --------------------------------------
//
// D2-3 (narrative assembly) and D3 (presentation) consume DiffReviewImpact
// after rule application. They should import from this module to get the
// post-rule shape rather than calling D2-1 directly.
export type { DiffReviewImpact } from './textui-diff-review-impact';
export type {
  DiffSummaryCategory,
  DiffSummarySeverity,
  DiffSummaryImpactAxis,
} from './textui-diff-review-impact';
