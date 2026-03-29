/**
 * D2-3: Summary narrative assembly and grouping.
 *
 * Takes `DiffReviewImpact[]` produced by D2-1 (`classifyReviewImpact`) and
 * optionally refined by D2-2 (`applySummaryRule`), and assembles them into
 * reviewer-readable grouped narratives.
 *
 * Design guardrails:
 * - Grouping is driven by `groupHint` (impactAxis) from D2-1/D2-2.
 * - Evidence (eventId, ruleTrace, heuristicDerived, ambiguityMarker) is
 *   preserved in every item. Narrative adds readability; it does not replace
 *   the underlying data.
 * - Narrative templates use `summaryKey` to produce stable, formatter-safe
 *   text without parsing evidence strings.
 * - Group ordering: ambiguity → structure → behavior → permission → flow →
 *   state → event → presentation (highest reviewer concern first).
 * - Within a group, items are ordered by severity descending (s3 first).
 */

import type {
  DiffSummaryImpactAxis,
  DiffSummarySeverity,
  DiffReviewImpact,
  DiffReviewImpactResult,
} from './textui-diff-review-impact';

// -- Output types -------------------------------------------------------------

export interface DiffNarrativeItem {
  /** Source eventId (one-to-one with DiffReviewImpact). */
  eventId: string;
  /** summaryKey from D2-1/D2-2. */
  summaryKey: string;
  severity: DiffSummarySeverity;
  /** Human-readable one-line description derived from summaryKey. */
  label: string;
  /** True when continuity was heuristic-derived. */
  heuristicDerived: boolean;
  /** True when the event reflects a conservative fallback or ambiguity. */
  ambiguityMarker: boolean;
  /** D2-1/D2-2 rule trace preserved for downstream traceability. */
  ruleTrace: string;
}

export interface DiffNarrativeGroup {
  /** Grouping axis. */
  axis: DiffSummaryImpactAxis;
  /** Highest severity in this group. */
  highestSeverity: DiffSummarySeverity;
  /** Assembled narrative paragraph for this group. */
  narrative: string;
  /** Items ordered by severity descending. */
  items: DiffNarrativeItem[];
}

export interface DiffNarrativeResult {
  kind: 'diff-narrative-result';
  groups: DiffNarrativeGroup[];
  metadata: {
    totalGroups: number;
    totalItems: number;
    highestSeverity: DiffSummarySeverity | null;
    containsAmbiguity: boolean;
    containsHeuristic: boolean;
  };
}

// -- Internal helpers ---------------------------------------------------------

const AXIS_ORDER: DiffSummaryImpactAxis[] = [
  'ambiguity',
  'structure',
  'behavior',
  'permission',
  'flow',
  'state',
  'event',
  'presentation',
];

const SEVERITY_RANK: Record<DiffSummarySeverity, number> = {
  's3-critical': 3,
  's2-review': 2,
  's1-notice': 1,
  's0-minor': 0,
};

function highestSeverityOf(items: DiffNarrativeItem[]): DiffSummarySeverity | null {
  if (items.length === 0) { return null; }
  return items.reduce<DiffSummarySeverity>((best, item) => {
    return SEVERITY_RANK[item.severity] > SEVERITY_RANK[best] ? item.severity : best;
  }, items[0].severity);
}

/**
 * Derive a human-readable label from a summaryKey.
 *
 * Pattern: `<domain>.<category>.<variant?>` → sentence fragment.
 * Unknown keys fall back to the raw summaryKey.
 */
function labelFromSummaryKey(summaryKey: string, heuristic: boolean): string {
  const suffix = heuristic ? ' (heuristic pairing)' : '';
  const labels: Record<string, string> = {
    'ambiguity.remove-add-fallback': 'Entity replaced — conservative fallback',
    'ambiguity.remove-add-kind':    'Entity replaced — remove+add kind',
    'structure.reorder.same-owner': 'Reorder within same owner',
    'structure.reorder.heuristic':  'Reorder — heuristic pairing',
    'structure.move.cross-owner':   'Move across owner boundary',
    'identity.rename.durable-handle': 'Rename — durable handle',
    'identity.rename.heuristic':    'Rename — heuristic pairing',
    'entity.added.structure':       'Entity added',
    'entity.added.behavior':        'Entity added (behavior)',
    'entity.added.presentation':    'Entity added (presentation)',
    'entity.removed.structure':     'Entity removed',
    'entity.removed.behavior':      'Entity removed (behavior)',
    'entity.removed.presentation':  'Entity removed (presentation)',
    'presentation.label-change':    'Presentation property changed',
    'presentation.label-change.heuristic': 'Presentation property changed — heuristic',
    'behavior.update.component':    'Component behavior updated',
    'behavior.update.heuristic':    'Component behavior updated — heuristic',
    // D2-2 refinement keys (permission / state / transition / event)
    'permission.added':             'Permission constraint added',
    'permission.removed':           'Permission constraint removed',
    'permission.updated':           'Permission constraint updated',
    'state.added':                  'State lifecycle node added',
    'state.removed':                'State lifecycle node removed',
    'state.updated':                'State lifecycle node updated',
    'transition.added':             'Transition added',
    'transition.removed':           'Transition removed',
    'transition.updated':           'Transition updated',
    'event.added':                  'Event handler added',
    'event.removed':                'Event handler removed',
    'event.updated':                'Event handler updated',
  };
  return (labels[summaryKey] ?? summaryKey) + suffix;
}

/**
 * Assemble a narrative paragraph for one group.
 *
 * Produces a Markdown summary sentence describing the group's content.
 * Evidence details are in the individual items; this text is a scannable
 * overview only.
 */
function buildNarrative(axis: DiffSummaryImpactAxis, items: DiffNarrativeItem[]): string {
  const count = items.length;
  const critical = items.filter(i => i.severity === 's3-critical').length;
  const heuristic = items.filter(i => i.heuristicDerived).length;
  const ambiguous = items.filter(i => i.ambiguityMarker).length;

  const axisLabel: Record<DiffSummaryImpactAxis, string> = {
    ambiguity:    'Ambiguity',
    structure:    'Structural',
    behavior:     'Behavior',
    permission:   'Permission',
    flow:         'Flow',
    state:        'State',
    event:        'Event',
    presentation: 'Presentation',
  };

  const parts: string[] = [`**${axisLabel[axis]}** — ${count} item${count !== 1 ? 's' : ''}`];
  if (critical > 0) { parts.push(`${critical} critical`); }
  if (ambiguous > 0) { parts.push(`${ambiguous} ambiguous`); }
  if (heuristic > 0) { parts.push(`${heuristic} heuristic-derived`); }

  return parts.join(', ') + '.';
}

// -- Public API ---------------------------------------------------------------

/**
 * Assemble a grouped narrative result from a `DiffReviewImpactResult`.
 *
 * Input is the complete output of `classifyReviewImpact` (D2-1), optionally
 * with per-item refinements from `applySummaryRule` (D2-2) already applied.
 * D2-3 does not call D2-1/D2-2 — it consumes their outputs.
 */
export function assembleSummaryNarrative(
  impactResult: DiffReviewImpactResult,
): DiffNarrativeResult {
  // Build items preserving all evidence fields
  const allItems: DiffNarrativeItem[] = impactResult.impacts.map(impact => ({
    eventId: impact.eventId,
    summaryKey: impact.summaryKey,
    severity: impact.severity,
    label: labelFromSummaryKey(impact.summaryKey, impact.heuristicDerived),
    heuristicDerived: impact.heuristicDerived,
    ambiguityMarker: impact.ambiguityMarker,
    ruleTrace: impact.ruleTrace,
  }));

  // Group by groupHint axis
  const grouped = new Map<DiffSummaryImpactAxis, DiffNarrativeItem[]>();
  for (const item of allItems) {
    // Look up groupHint via the original impact to preserve D2-1's axis choice
    const impact = impactResult.impacts.find(i => i.eventId === item.eventId);
    const axis: DiffSummaryImpactAxis = impact?.groupHint ?? 'ambiguity';
    const existing = grouped.get(axis);
    if (existing !== undefined) {
      existing.push(item);
    } else {
      grouped.set(axis, [item]);
    }
  }

  // Sort items within each group by severity descending
  for (const items of grouped.values()) {
    items.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
  }

  // Build groups in canonical axis order
  const groups: DiffNarrativeGroup[] = AXIS_ORDER
    .filter(axis => grouped.has(axis))
    .map(axis => {
      const items = grouped.get(axis)!;
      const highestSeverity = highestSeverityOf(items)!;
      return {
        axis,
        highestSeverity,
        narrative: buildNarrative(axis, items),
        items,
      };
    });

  // Compute result metadata
  const allNarrativeItems = groups.flatMap(g => g.items);
  const highestSeverity =
    groups.length > 0
      ? groups.reduce<DiffSummarySeverity>((best, g) => {
          return SEVERITY_RANK[g.highestSeverity] > SEVERITY_RANK[best]
            ? g.highestSeverity
            : best;
        }, groups[0].highestSeverity)
      : null;

  return {
    kind: 'diff-narrative-result',
    groups,
    metadata: {
      totalGroups: groups.length,
      totalItems: allNarrativeItems.length,
      highestSeverity,
      containsAmbiguity: allNarrativeItems.some(i => i.ambiguityMarker),
      containsHeuristic: allNarrativeItems.some(i => i.heuristicDerived),
    },
  };
}
