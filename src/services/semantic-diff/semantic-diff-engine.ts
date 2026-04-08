import type {
  ChangeGroup,
  ChangeLayer,
  DiffSummary,
  HumanReadableChange,
  SemanticConfidenceAssessment,
  SemanticConfidenceBand,
  SemanticChange,
  SemanticChangeEvidence,
  SemanticEvidenceNavigationTarget,
  SemanticDiff,
  SemanticDiffConfidenceSummary,
  SemanticDiffIRNode,
  SemanticDiffIRRoot,
  SemanticDiffIRValue,
  UpdateEvent,
  UpdateProps
} from '../../types/semantic-diff';
import { computeStructureSemanticChanges } from './structure-semantic-diff';

type ComparableSurfaceName = 'props' | 'events';

interface MatchedNodes {
  previous: SemanticDiffIRNode;
  next: SemanticDiffIRNode;
}

const GROUP_ORDER: ChangeLayer[] = ['structure', 'behavior', 'visual', 'data'];

const PRESENTATION_PROP_KEYS = new Set([
  'label',
  'title',
  'message',
  'placeholder',
  'value',
  'alt',
  'body'
]);

const HIGH_IMPACT_PROP_KEYS = new Set(['href', 'target']);

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number): number {
  return Math.round(clampScore(value) * 100) / 100;
}

function bandForScore(score: number): SemanticConfidenceBand {
  if (score >= 0.7) {
    return 'high';
  }
  if (score >= 0.4) {
    return 'medium';
  }
  return 'low';
}

function confidenceAssessment(score: number, reasonSummary: string): SemanticConfidenceAssessment {
  const rounded = roundScore(score);
  const band = bandForScore(rounded);
  return {
    score: rounded,
    band,
    tier: band === 'high' ? 'accept' : band === 'medium' ? 'review' : 'reject',
    reasonSummary
  };
}

function flattenNodes(root: SemanticDiffIRRoot): Map<string, SemanticDiffIRNode> {
  const nodes = new Map<string, SemanticDiffIRNode>();

  const visit = (node: SemanticDiffIRNode): void => {
    node.children.forEach(child => {
      nodes.set(child.nodeId, child);
      visit(child);
    });
  };

  root.screens.forEach(screen => visit(screen.rootNode));
  return nodes;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`);
    return `{${entries.join(',')}}`;
  }

  return JSON.stringify(value);
}

function valuesEqual(left: SemanticDiffIRValue | undefined, right: SemanticDiffIRValue | undefined): boolean {
  if (!left || !right) {
    return left === right;
  }

  return left.explicitness === right.explicitness && stableStringify(left.value) === stableStringify(right.value);
}

function getComponentLabel(node: SemanticDiffIRNode): string {
  const labelKeys = ['label', 'title', 'value', 'message', 'name'];
  for (const key of labelKeys) {
    const value = node.props[key]?.value;
    if (typeof value === 'string' && value.length > 0) {
      return `${node.componentKind} "${value}"`;
    }
  }

  if (node.stableId) {
    return `${node.componentKind} "${node.stableId}"`;
  }

  return node.componentKind;
}

function parseNavigationTarget(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const match = value.match(/navigate\((['"`])(.+?)\1\)/);
  return match ? match[2] : null;
}

function formatValue(value: unknown): string {
  if (value === undefined) {
    return '(none)';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return stableStringify(value);
}

function buildPropHumanReadable(node: SemanticDiffIRNode, propKey: string, before: unknown, after: unknown): HumanReadableChange {
  const actor = getComponentLabel(node);
  const beforeText = formatValue(before);
  const afterText = formatValue(after);

  if (propKey === 'href') {
    return {
      title: `${actor} link target changed`,
      description: `${actor} now points to ${afterText} instead of ${beforeText}.`,
      impact: 'high'
    };
  }

  return {
    title: `${actor} ${propKey} changed`,
    description: `${actor} changed ${propKey} from ${beforeText} to ${afterText}.`,
    impact: HIGH_IMPACT_PROP_KEYS.has(propKey) ? 'high' : 'low'
  };
}

function buildEventHumanReadable(node: SemanticDiffIRNode, eventKey: string, before: unknown, after: unknown): HumanReadableChange {
  const actor = getComponentLabel(node);
  const beforeNavigation = parseNavigationTarget(before);
  const afterNavigation = parseNavigationTarget(after);

  if (beforeNavigation || afterNavigation) {
    return {
      title: `${actor} navigation changed`,
      description: `Clicking ${actor} now navigates to ${afterNavigation ?? formatValue(after)} instead of ${beforeNavigation ?? formatValue(before)}.`,
      impact: 'high'
    };
  }

  return {
    title: `${actor} ${eventKey} behavior changed`,
    description: `${actor} changed ${eventKey} from ${formatValue(before)} to ${formatValue(after)}.`,
    impact: 'medium'
  };
}

function propLayerForKey(propKey: string): 'behavior' | 'visual' {
  return PRESENTATION_PROP_KEYS.has(propKey) ? 'visual' : 'behavior';
}

function compareSurface(
  matches: MatchedNodes[],
  surfaceName: ComparableSurfaceName
): Array<UpdateProps | UpdateEvent> {
  const changes: Array<UpdateProps | UpdateEvent> = [];

  matches.forEach(match => {
    const previousSurface = match.previous[surfaceName] ?? {};
    const nextSurface = match.next[surfaceName] ?? {};
    const keys = new Set([...Object.keys(previousSurface), ...Object.keys(nextSurface)]);

    [...keys].sort((left, right) => left.localeCompare(right)).forEach(key => {
      const beforeValue = previousSurface[key];
      const afterValue = nextSurface[key];

      if (!beforeValue && !afterValue) {
        return;
      }

      if (valuesEqual(beforeValue, afterValue)) {
        return;
      }

      const beforeComparable = beforeValue?.value;
      const afterComparable = afterValue?.value;

      if (surfaceName === 'events') {
        changes.push({
          type: 'UpdateEvent',
          layer: 'behavior',
          componentId: match.next.nodeId,
          identityBasis: match.next.stableId ? 'stable-id' : 'owner-path',
          evidence: {
            previous: beforeValue?.sourceRef ?? match.previous.sourceRef,
            next: afterValue?.sourceRef ?? match.next.sourceRef
          },
          humanReadable: buildEventHumanReadable(match.next, key, beforeComparable, afterComparable),
          eventKey: key,
          before: beforeComparable,
          after: afterComparable
        });
        return;
      }

      changes.push({
        type: 'UpdateProps',
        layer: propLayerForKey(key),
        componentId: match.next.nodeId,
        identityBasis: match.next.stableId ? 'stable-id' : 'owner-path',
        evidence: {
          previous: beforeValue?.sourceRef ?? match.previous.sourceRef,
          next: afterValue?.sourceRef ?? match.next.sourceRef
        },
        humanReadable: buildPropHumanReadable(match.next, key, beforeComparable, afterComparable),
        propKey: key,
        before: beforeComparable,
        after: afterComparable
      });
    });
  });

  return changes;
}

function collectMatchedNodes(previous: SemanticDiffIRRoot, next: SemanticDiffIRRoot): MatchedNodes[] {
  const previousNodes = flattenNodes(previous);
  const nextNodes = flattenNodes(next);

  return [...nextNodes.keys()]
    .filter(nodeId => previousNodes.has(nodeId))
    .sort((left, right) => left.localeCompare(right))
    .map(nodeId => ({
      previous: previousNodes.get(nodeId),
      next: nextNodes.get(nodeId)
    }))
    .filter((pair): pair is MatchedNodes => Boolean(pair.previous && pair.next));
}

function compareSemanticChanges(left: SemanticChange, right: SemanticChange): number {
  const layerDiff = GROUP_ORDER.indexOf(left.layer) - GROUP_ORDER.indexOf(right.layer);
  if (layerDiff !== 0) {
    return layerDiff;
  }

  const typeDiff = left.type.localeCompare(right.type);
  if (typeDiff !== 0) {
    return typeDiff;
  }

  return left.componentId.localeCompare(right.componentId);
}

function buildSummary(changes: SemanticChange[]): DiffSummary {
  return changes.reduce<DiffSummary>((summary, change) => {
    switch (change.type) {
      case 'AddComponent':
        summary.added += 1;
        break;
      case 'RemoveComponent':
        summary.removed += 1;
        break;
      case 'MoveComponent':
        summary.moved += 1;
        break;
      default:
        summary.modified += 1;
        break;
    }

    return summary;
  }, {
    added: 0,
    removed: 0,
    modified: 0,
    moved: 0
  });
}

function buildGroupedChanges(changes: SemanticChange[]): ChangeGroup[] {
  return GROUP_ORDER.map(type => ({
    type,
    changes: changes.filter(change => change.layer === type)
  }));
}

function scoreIdentityBasis(identityBasis: SemanticChange['identityBasis']): number {
  switch (identityBasis) {
    case 'stable-id':
      return 0.95;
    case 'slot-anchor':
      return 0.85;
    case 'owner-path':
      return 0.72;
    case 'event-handle':
    case 'binding-handle':
      return 0.8;
    case 'fallback':
      return 0.45;
    default:
      return 0.5;
  }
}

function buildChangeConfidence(change: SemanticChange): SemanticConfidenceAssessment {
  if (change.ambiguityReason) {
    return confidenceAssessment(0.25, `Ambiguous match path: ${change.ambiguityReason}.`);
  }

  let score = scoreIdentityBasis(change.identityBasis);
  const reasons = [`Identity basis: ${change.identityBasis}.`];

  if (!change.evidence?.navigation?.primary) {
    score -= 0.1;
    reasons.push('Primary evidence navigation is missing.');
  }

  if (change.type === 'MoveComponent' && change.identityBasis !== 'stable-id') {
    score -= 0.12;
    reasons.push('Move confidence is reduced without stable-id continuity.');
  }

  if ((change.type === 'UpdateEvent' || change.type === 'UpdateProps')
    && change.humanReadable?.impact === 'high'
    && change.identityBasis !== 'stable-id') {
    score -= 0.08;
    reasons.push('High-impact change without stable-id continuity.');
  }

  return confidenceAssessment(score, reasons.join(' '));
}

function buildDiffConfidence(changes: SemanticChange[]): SemanticDiffConfidenceSummary {
  if (changes.length === 0) {
    return {
      ...confidenceAssessment(1, 'No semantic changes detected.'),
      ambiguousChanges: 0,
      lowConfidenceChanges: 0,
      recommendedAction: 'promote'
    };
  }

  const ambiguousChanges = changes.filter(change => Boolean(change.ambiguityReason)).length;
  const lowConfidenceChanges = changes.filter(change => change.confidence?.tier === 'reject').length;
  const averageScore = changes.reduce((sum, change) => sum + (change.confidence?.score ?? 0), 0) / changes.length;
  const adjustedScore = averageScore - (ambiguousChanges * 0.1) - (lowConfidenceChanges * 0.05);
  const base = confidenceAssessment(adjustedScore, [
    `${changes.length} semantic change(s) evaluated.`,
    `${ambiguousChanges} ambiguous change(s).`,
    `${lowConfidenceChanges} low-confidence change(s).`
  ].join(' '));

  return {
    ...base,
    ambiguousChanges,
    lowConfidenceChanges,
    recommendedAction: base.tier === 'accept' ? 'promote' : base.tier === 'review' ? 'canary' : 'hold'
  };
}

function buildNavigationTarget(
  side: 'previous' | 'next',
  sourceRef: SemanticChangeEvidence['previous']
): SemanticEvidenceNavigationTarget | undefined {
  if (!sourceRef?.entityPath) {
    return undefined;
  }

  const location = sourceRef.documentPath
    ? `${sourceRef.documentPath}#${sourceRef.entityPath}`
    : sourceRef.entityPath;

  return {
    side,
    documentPath: sourceRef.documentPath,
    entityPath: sourceRef.entityPath,
    location
  };
}

function withEvidenceNavigation(change: SemanticChange): SemanticChange {
  const evidence = change.evidence;
  const confidence = buildChangeConfidence(change);
  if (!evidence) {
    return {
      ...change,
      confidence
    };
  }

  const previous = buildNavigationTarget('previous', evidence.previous);
  const next = buildNavigationTarget('next', evidence.next);
  const primary = change.type === 'RemoveComponent'
    ? previous ?? next
    : next ?? previous;

  return {
    ...change,
    confidence,
    evidence: {
      ...evidence,
      navigation: {
        primary,
        previous,
        next
      }
    }
  };
}

export function computeSemanticPropAndEventChanges(
  previous: SemanticDiffIRRoot,
  next: SemanticDiffIRRoot
): Array<UpdateProps | UpdateEvent> {
  const matches = collectMatchedNodes(previous, next);
  const propChanges = compareSurface(matches, 'props');
  const eventChanges = compareSurface(matches, 'events');

  return [...propChanges, ...eventChanges].sort(compareSemanticChanges);
}

export function buildSemanticDiff(previous: SemanticDiffIRRoot, next: SemanticDiffIRRoot): SemanticDiff {
  const structureChanges = computeStructureSemanticChanges(previous, next);
  const semanticUpdates = computeSemanticPropAndEventChanges(previous, next);
  const changes = [...structureChanges, ...semanticUpdates]
    .sort(compareSemanticChanges)
    .map(withEvidenceNavigation);

  return {
    summary: buildSummary(changes),
    changes,
    grouped: buildGroupedChanges(changes),
    confidence: buildDiffConfidence(changes)
  };
}
