import type {
  VisualDiffChangeNode,
  VisualDiffViewModel,
} from './textui-visual-diff-view-model';

export type VisualDiffSeverityTone = 'critical' | 'warn' | 'notice' | 'minor';
export type VisualDiffBadge =
  | 'heuristic'
  | 'ambiguous'
  | 'fallback'
  | 'replace'
  | 'review-required';
export type VisualDiffRenderStyle =
  | 'addition'
  | 'removal'
  | 'update'
  | 'reorder'
  | 'move'
  | 'rename'
  | 'replace-split';

export interface VisualDiffPresentationRule {
  nodeId: string;
  changeKind: VisualDiffChangeNode['changeKind'];
  severityTone: VisualDiffSeverityTone;
  severityLabel: VisualDiffSeverityTone;
  renderStyle: VisualDiffRenderStyle;
  badges: VisualDiffBadge[];
  reviewPriority: 'high' | 'medium' | 'low';
  displayLabel: string;
  pathPresentation: {
    beforePathRequired: boolean;
    afterPathRequired: boolean;
  };
}

export interface VisualDiffPresentationModel {
  kind: 'visual-diff-presentation/v0';
  items: VisualDiffPresentationRule[];
  metadata: {
    totalItems: number;
    containsHeuristic: boolean;
    containsAmbiguity: boolean;
    severityLegend: {
      critical: 's3-critical';
      warn: 's2-review';
      notice: 's1-notice';
      minor: 's0-minor';
    };
  };
}

function severityToneOf(node: VisualDiffChangeNode): VisualDiffSeverityTone {
  switch (node.severity) {
    case 's3-critical':
      return 'critical';
    case 's2-review':
      return 'warn';
    case 's1-notice':
      return 'notice';
    case 's0-minor':
      return 'minor';
  }
}

function renderStyleOf(node: VisualDiffChangeNode): VisualDiffRenderStyle {
  switch (node.changeKind) {
    case 'add':
      return 'addition';
    case 'remove':
      return 'removal';
    case 'update':
      return 'update';
    case 'reorder':
      return 'reorder';
    case 'move':
      return 'move';
    case 'rename':
      return 'rename';
    case 'remove+add':
      return 'replace-split';
  }
}

function badgesOf(node: VisualDiffChangeNode): VisualDiffBadge[] {
  const badges: VisualDiffBadge[] = [];

  if (node.changeKind === 'remove+add') {
    badges.push('replace');
  }
  if (node.isHeuristic) {
    badges.push('heuristic');
  }
  if (node.isAmbiguous) {
    badges.push('ambiguous');
  }
  if (node.isAmbiguous || node.changeKind === 'remove+add') {
    badges.push('fallback');
  }
  if (node.isHeuristic && (node.severity === 's3-critical' || node.severity === 's2-review')) {
    badges.push('review-required');
  }

  return badges;
}

function reviewPriorityOf(node: VisualDiffChangeNode): 'high' | 'medium' | 'low' {
  if (node.isAmbiguous || node.severity === 's3-critical') {
    return 'high';
  }
  if (node.isHeuristic || node.severity === 's2-review') {
    return 'medium';
  }
  return 'low';
}

function pathRequirementOf(node: VisualDiffChangeNode): {
  beforePathRequired: boolean;
  afterPathRequired: boolean;
} {
  switch (node.changeKind) {
    case 'add':
      return { beforePathRequired: false, afterPathRequired: true };
    case 'remove':
      return { beforePathRequired: true, afterPathRequired: false };
    default:
      return { beforePathRequired: true, afterPathRequired: true };
  }
}

export function mapVisualDiffPresentation(
  node: VisualDiffChangeNode
): VisualDiffPresentationRule {
  const severityTone = severityToneOf(node);

  return {
    nodeId: node.nodeId,
    changeKind: node.changeKind,
    severityTone,
    severityLabel: severityTone,
    renderStyle: renderStyleOf(node),
    badges: badgesOf(node),
    reviewPriority: reviewPriorityOf(node),
    displayLabel: node.label,
    pathPresentation: pathRequirementOf(node),
  };
}

export function buildVisualDiffPresentationModel(
  viewModel: VisualDiffViewModel
): VisualDiffPresentationModel {
  return {
    kind: 'visual-diff-presentation/v0',
    items: viewModel.items.map(mapVisualDiffPresentation),
    metadata: {
      totalItems: viewModel.items.length,
      containsHeuristic: viewModel.metadata.containsHeuristic,
      containsAmbiguity: viewModel.metadata.containsAmbiguity,
      severityLegend: {
        critical: 's3-critical',
        warn: 's2-review',
        notice: 's1-notice',
        minor: 's0-minor',
      },
    },
  };
}
