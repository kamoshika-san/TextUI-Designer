import type {
  DiffCompareResult,
  DiffEvent,
  DiffEventKind,
  DiffEntityKind,
  DiffFallbackMarker,
  DiffPairingReason,
} from './textui-core-diff';

// -- Summary vocabulary types ------------------------------------------------

export type DiffSummaryCategory =
  | 'presentation-update'
  | 'structure-reorder'
  | 'structure-move'
  | 'identity-rename'
  | 'entity-added'
  | 'entity-removed'
  | 'entity-replaced'
  | 'behavior-update'
  | 'permission-update'
  | 'ambiguity-warning';

export type DiffSummarySeverity = 's0-minor' | 's1-notice' | 's2-review' | 's3-critical';

export type DiffSummaryImpactAxis =
  | 'presentation'
  | 'structure'
  | 'behavior'
  | 'flow'
  | 'state'
  | 'event'
  | 'permission'
  | 'ambiguity';

// -- Review impact output ----------------------------------------------------

/**
 * One review-impact classification derived from one structural diff event.
 * This is the output of the D2-1 rule layer and the primary input for D2-3
 * narrative assembly and D3 presentation layers.
 *
 * Rule source is always traceable via `ruleTrace`.
 */
export interface DiffReviewImpact {
  /** Source structural event id. Always one-to-one with a DiffEvent. */
  eventId: string;
  /** Structural event kind preserved for downstream traceability. */
  sourceEventKind: DiffEventKind;
  /** Structural entity kind preserved for grouping and axis decisions. */
  sourceEntityKind: DiffEntityKind;
  /** Summary category derived by applying the impact rules. */
  category: DiffSummaryCategory;
  /** Reviewer-attention severity level. */
  severity: DiffSummarySeverity;
  /** Primary impact axis for grouping. */
  impactAxis: DiffSummaryImpactAxis;
  /**
   * Stable formatter-facing key that identifies the specific sub-case.
   * Formatters use this for message templates without parsing evidence.
   * Examples: 'structure.move.cross-owner', 'ambiguity.remove-add-fallback'.
   */
  summaryKey: string;
  /**
   * Provisional group hint based on owner impact axis. D2-3 grouping rules
   * may merge or refine groups; this is a conservative default input.
   */
  groupHint: DiffSummaryImpactAxis;
  /** True when continuity was heuristic-derived rather than deterministic. */
  heuristicDerived: boolean;
  /** True when the event reflects a conservative fallback or ambiguity. */
  ambiguityMarker: boolean;
  /** Human-readable trace explaining which rule produced this classification. */
  ruleTrace: string;
}

// -- Rule application result -------------------------------------------------

export interface DiffReviewImpactResult {
  kind: 'diff-review-impact-result';
  impacts: DiffReviewImpact[];
  metadata: {
    totalImpacts: number;
    highestSeverity: DiffSummarySeverity | null;
    containsHeuristic: boolean;
    containsAmbiguity: boolean;
  };
}

// -- Internal classification helpers -----------------------------------------

type BaseClassification = {
  category: DiffSummaryCategory;
  severity: DiffSummarySeverity;
  impactAxis: DiffSummaryImpactAxis;
  summaryKey: string;
  ruleTrace: string;
};

function isHeuristicPairing(pairingReason: DiffPairingReason): boolean {
  return pairingReason === 'heuristic-similarity';
}

function isConservativeFallback(fallbackMarker: DiffFallbackMarker): boolean {
  return fallbackMarker === 'remove-add-fallback';
}

/**
 * Determine the primary impact axis for add/remove events based on entity kind.
 *
 * The current entity kind vocabulary (page / component / property) does not yet
 * distinguish state/event/transition nodes directly — those arrive via extension
 * hooks (Epic A reserved). Until extension hooks are populated, default to
 * 'structure' for all entity kinds except where fallback identity keys already
 * signal a domain category.
 *
 * This conservatism ensures downstream layers do not build on assumed axes that
 * extension work will later correct.
 */
function ownerBasedAxis(_entityKind: DiffEntityKind): DiffSummaryImpactAxis {
  return 'structure';
}

/**
 * Classify a single diff event into a base review-impact category.
 *
 * Rule application order follows the mapping matrix in
 * docs/diff-summary-event-vocabulary.md:
 *
 * 1. Conservative fallback (`remove+add` or `fallbackMarker: remove-add-fallback`)
 *    -> entity-replaced / s3-critical / ambiguity
 * 2. `remove+add` kind without explicit conservative marker
 *    -> entity-replaced / s3-critical / ambiguity (same: no remove+add is safe to
 *       soften without confirmed continuity)
 * 3. Deterministic structural kinds: reorder, move, rename, add, remove
 * 4. `update`: distinguished by entity kind; property -> presentation, component ->
 *    behavior-update by conservative default (extension hooks will refine later)
 */
function classifyEvent(event: DiffEvent): BaseClassification {
  const { kind, entityKind, trace } = event;
  const { pairingReason, fallbackMarker } = trace;

  // Conservative fallback: always entity-replaced regardless of reported kind
  if (isConservativeFallback(fallbackMarker)) {
    return {
      category: 'entity-replaced',
      severity: 's3-critical',
      impactAxis: 'ambiguity',
      summaryKey: 'ambiguity.remove-add-fallback',
      ruleTrace: 'fallbackMarker=remove-add-fallback -> entity-replaced / s3-critical / ambiguity',
    };
  }

  // Explicit remove+add kind without a softer continuity signal
  if (kind === 'remove+add') {
    return {
      category: 'entity-replaced',
      severity: 's3-critical',
      impactAxis: 'ambiguity',
      summaryKey: 'ambiguity.remove-add-kind',
      ruleTrace: 'event.kind=remove+add -> entity-replaced / s3-critical / ambiguity',
    };
  }

  const isHeuristic = isHeuristicPairing(pairingReason);

  switch (kind) {
    case 'reorder': {
      // Heuristic reorder escalates one severity level per guardrail rule
      const severity: DiffSummarySeverity = isHeuristic ? 's2-review' : 's1-notice';
      return {
        category: 'structure-reorder',
        severity,
        impactAxis: 'structure',
        summaryKey: isHeuristic ? 'structure.reorder.heuristic' : 'structure.reorder.same-owner',
        ruleTrace: `event.kind=reorder heuristic=${isHeuristic} -> structure-reorder / ${severity} / structure`,
      };
    }

    case 'move': {
      return {
        category: 'structure-move',
        severity: 's2-review',
        impactAxis: 'structure',
        summaryKey: 'structure.move.cross-owner',
        ruleTrace: 'event.kind=move -> structure-move / s2-review / structure',
      };
    }

    case 'rename': {
      // Heuristic rename escalates one level
      const severity: DiffSummarySeverity = isHeuristic ? 's2-review' : 's1-notice';
      return {
        category: 'identity-rename',
        severity,
        impactAxis: 'behavior',
        summaryKey: isHeuristic ? 'identity.rename.heuristic' : 'identity.rename.durable-handle',
        ruleTrace: `event.kind=rename heuristic=${isHeuristic} -> identity-rename / ${severity} / behavior`,
      };
    }

    case 'add': {
      const axis = ownerBasedAxis(entityKind);
      return {
        category: 'entity-added',
        severity: 's1-notice',
        impactAxis: axis,
        summaryKey: `entity.added.${axis}`,
        ruleTrace: `event.kind=add entityKind=${entityKind} -> entity-added / s1-notice / ${axis}`,
      };
    }

    case 'remove': {
      const axis = ownerBasedAxis(entityKind);
      return {
        category: 'entity-removed',
        severity: 's2-review',
        impactAxis: axis,
        summaryKey: `entity.removed.${axis}`,
        ruleTrace: `event.kind=remove entityKind=${entityKind} -> entity-removed / s2-review / ${axis}`,
      };
    }

    case 'update': {
      // Property updates: presentation-scoped by default (label, body, helper text)
      if (entityKind === 'property') {
        const severity: DiffSummarySeverity = isHeuristic ? 's1-notice' : 's0-minor';
        return {
          category: 'presentation-update',
          severity,
          impactAxis: 'presentation',
          summaryKey: isHeuristic ? 'presentation.label-change.heuristic' : 'presentation.label-change',
          ruleTrace: `event.kind=update entityKind=property heuristic=${isHeuristic} -> presentation-update / ${severity} / presentation`,
        };
      }
      // Component/page updates: behavior-update is the conservative default until
      // extension hooks (Epic A) surface permission or domain-specific cues.
      // Rule source: adapter-contract § Entity kind + no extension hook present
      const severity: DiffSummarySeverity = isHeuristic ? 's3-critical' : 's2-review';
      return {
        category: 'behavior-update',
        severity,
        impactAxis: 'behavior',
        summaryKey: isHeuristic ? 'behavior.update.heuristic' : 'behavior.update.component',
        ruleTrace: `event.kind=update entityKind=${entityKind} heuristic=${isHeuristic} -> behavior-update / ${severity} / behavior (extension hooks absent; conservative default)`,
      };
    }
  }
}

function severityRank(s: DiffSummarySeverity): number {
  const ranks: Record<DiffSummarySeverity, number> = {
    's0-minor': 0,
    's1-notice': 1,
    's2-review': 2,
    's3-critical': 3,
  };
  return ranks[s];
}

function highestSeverity(impacts: DiffReviewImpact[]): DiffSummarySeverity | null {
  if (impacts.length === 0) { return null; }
  return impacts.reduce<DiffSummarySeverity>((best, imp) => {
    return severityRank(imp.severity) > severityRank(best) ? imp.severity : best;
  }, impacts[0].severity);
}

// -- Public API --------------------------------------------------------------

/**
 * Classify all events in a diff compare result into reviewer-facing
 * review-impact items.
 *
 * Each input DiffEvent produces exactly one DiffReviewImpact. The
 * one-to-one mapping preserves structural traceability and lets downstream
 * grouping (D2-3) decide which items belong together without losing evidence.
 *
 * Rule source for every item is recorded in `ruleTrace`.
 */
export function classifyReviewImpact(result: DiffCompareResult): DiffReviewImpactResult {
  const impacts: DiffReviewImpact[] = result.events.map((event) => {
    const base = classifyEvent(event);
    const heuristicDerived = isHeuristicPairing(event.trace.pairingReason);
    const ambiguityMarker =
      isConservativeFallback(event.trace.fallbackMarker) ||
      event.kind === 'remove+add' ||
      base.category === 'entity-replaced' ||
      base.category === 'ambiguity-warning';

    return {
      eventId: event.eventId,
      sourceEventKind: event.kind,
      sourceEntityKind: event.entityKind,
      category: base.category,
      severity: base.severity,
      impactAxis: base.impactAxis,
      summaryKey: base.summaryKey,
      groupHint: base.impactAxis,
      heuristicDerived,
      ambiguityMarker,
      ruleTrace: base.ruleTrace,
    };
  });

  return {
    kind: 'diff-review-impact-result',
    impacts,
    metadata: {
      totalImpacts: impacts.length,
      highestSeverity: highestSeverity(impacts),
      containsHeuristic: impacts.some((i) => i.heuristicDerived),
      containsAmbiguity: impacts.some((i) => i.ambiguityMarker),
    },
  };
}
