import type {
  DiffExternalEvent,
  DiffExternalEventKind,
  DiffResultExternal,
} from './textui-diff-result-external';
import type {
  DiffReviewImpact,
  DiffReviewImpactResult,
  DiffSummaryImpactAxis,
  DiffSummarySeverity,
} from './textui-diff-review-impact';
import type {
  DiffNarrativeGroup,
  DiffNarrativeItem,
  DiffNarrativeResult,
} from './textui-diff-summary-narrative';

export const VISUAL_DIFF_CHANGE_KINDS: readonly DiffExternalEventKind[] = [
  'add',
  'remove',
  'update',
  'reorder',
  'move',
  'rename',
  'remove+add',
] as const;

export interface VisualDiffEvidenceRefs {
  eventId: string;
  impactEventId?: string;
  summaryKey?: string;
  narrativeAxis?: DiffSummaryImpactAxis;
  narrativeIndex?: number;
  previousSourcePath?: string;
  nextSourcePath?: string;
}

export interface VisualDiffChangeNode {
  nodeId: string;
  changeKind: DiffExternalEventKind;
  entityKind: DiffExternalEvent['entityKind'];
  severity: DiffSummarySeverity;
  isHeuristic: boolean;
  isAmbiguous: boolean;
  beforePath?: string;
  afterPath?: string;
  label: string;
  evidenceRefs: VisualDiffEvidenceRefs;
}

export interface VisualDiffNarrativeGroupView {
  axis: DiffSummaryImpactAxis;
  highestSeverity: DiffSummarySeverity;
  narrative: string;
  eventIds: string[];
}

export interface VisualDiffViewModel {
  kind: 'visual-diff-view-model/v0';
  items: VisualDiffChangeNode[];
  groups: VisualDiffNarrativeGroupView[];
  metadata: {
    totalItems: number;
    highestSeverity: DiffSummarySeverity | null;
    containsHeuristic: boolean;
    containsAmbiguity: boolean;
    sourceMapping: {
      external: 'DiffResultExternal.events[]';
      reviewImpact: 'DiffReviewImpactResult.impacts[]';
      narrative: 'DiffNarrativeResult.groups[].items[]';
    };
  };
}

export interface BuildVisualDiffViewModelInput {
  external: DiffResultExternal;
  reviewImpact: DiffReviewImpactResult;
  narrative: DiffNarrativeResult;
}

function isHeuristicEvent(event: DiffExternalEvent, impact?: DiffReviewImpact): boolean {
  return event.pairingReason === 'heuristic-similarity' || impact?.heuristicDerived === true;
}

function isAmbiguousEvent(event: DiffExternalEvent, impact?: DiffReviewImpact): boolean {
  return event.fallbackMarker === 'remove-add-fallback' || impact?.ambiguityMarker === true;
}

function fallbackLabel(event: DiffExternalEvent, impact?: DiffReviewImpact): string {
  if (impact?.ruleTrace) {
    return impact.ruleTrace;
  }
  return `${event.kind} ${event.entityKind}`;
}

function buildNarrativeItemLookup(
  narrative: DiffNarrativeResult
): Map<string, { item: DiffNarrativeItem; group: DiffNarrativeGroup; index: number }> {
  const lookup = new Map<string, { item: DiffNarrativeItem; group: DiffNarrativeGroup; index: number }>();

  for (const group of narrative.groups) {
    group.items.forEach((item, index) => {
      lookup.set(item.eventId, { item, group, index });
    });
  }

  return lookup;
}

function validateSupportedEventKinds(events: DiffExternalEvent[]): void {
  const allowed = new Set<string>(VISUAL_DIFF_CHANGE_KINDS);
  for (const event of events) {
    if (!allowed.has(event.kind)) {
      throw new Error(`Unsupported visual diff change kind: ${event.kind}`);
    }
  }
}

export function buildVisualDiffViewModel(input: BuildVisualDiffViewModelInput): VisualDiffViewModel {
  validateSupportedEventKinds(input.external.events);

  const impactByEventId = new Map<string, DiffReviewImpact>(
    input.reviewImpact.impacts.map((impact) => [impact.eventId, impact])
  );
  const narrativeByEventId = buildNarrativeItemLookup(input.narrative);

  const items: VisualDiffChangeNode[] = input.external.events.map((event) => {
    const impact = impactByEventId.get(event.eventId);
    const narrativeEntry = narrativeByEventId.get(event.eventId);

    return {
      nodeId: event.eventId,
      changeKind: event.kind,
      entityKind: event.entityKind,
      severity: impact?.severity ?? 's0-minor',
      isHeuristic: isHeuristicEvent(event, impact),
      isAmbiguous: isAmbiguousEvent(event, impact),
      beforePath: event.previousPath,
      afterPath: event.nextPath,
      label: narrativeEntry?.item.label ?? fallbackLabel(event, impact),
      evidenceRefs: {
        eventId: event.eventId,
        impactEventId: impact?.eventId,
        summaryKey: impact?.summaryKey,
        narrativeAxis: narrativeEntry?.group.axis,
        narrativeIndex: narrativeEntry?.index,
        previousSourcePath: input.external.metadata.previousSource.sourcePath,
        nextSourcePath: input.external.metadata.nextSource.sourcePath,
      },
    };
  });

  return {
    kind: 'visual-diff-view-model/v0',
    items,
    groups: input.narrative.groups.map((group) => ({
      axis: group.axis,
      highestSeverity: group.highestSeverity,
      narrative: group.narrative,
      eventIds: group.items.map((item) => item.eventId),
    })),
    metadata: {
      totalItems: items.length,
      highestSeverity: input.reviewImpact.metadata.highestSeverity,
      containsHeuristic: items.some((item) => item.isHeuristic),
      containsAmbiguity: items.some((item) => item.isAmbiguous),
      sourceMapping: {
        external: 'DiffResultExternal.events[]',
        reviewImpact: 'DiffReviewImpactResult.impacts[]',
        narrative: 'DiffNarrativeResult.groups[].items[]',
      },
    },
  };
}
