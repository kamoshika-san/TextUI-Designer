import type {
  VisualDiffChangeNode,
  VisualDiffViewModel,
} from './textui-visual-diff-view-model';

export type VisualDiffNavigationAvailability = 'available' | 'unavailable';
export type VisualDiffNavigationMissingReason =
  | 'not-applicable'
  | 'missing-path'
  | 'missing-source-ref'
  | 'missing-path-and-source-ref';
export type VisualDiffNavigationCompactVisibility = 'primary' | 'secondary' | 'hidden';
export type VisualDiffNavigationFullVisibility = 'visible' | 'muted';

export interface VisualDiffNavigationLink {
  side: 'before' | 'after';
  availability: VisualDiffNavigationAvailability;
  label: string;
  path?: string;
  sourcePath?: string;
  missingReason: VisualDiffNavigationMissingReason | null;
  fallbackText: string;
  visibility: {
    compact: VisualDiffNavigationCompactVisibility;
    full: VisualDiffNavigationFullVisibility;
  };
}

export interface VisualDiffNavigationRule {
  nodeId: string;
  changeKind: VisualDiffChangeNode['changeKind'];
  primarySide: 'before' | 'after' | 'both' | 'none';
  before: VisualDiffNavigationLink;
  after: VisualDiffNavigationLink;
}

export interface VisualDiffNavigationModel {
  kind: 'visual-diff-navigation/v0';
  items: VisualDiffNavigationRule[];
  metadata: {
    totalItems: number;
    supportsCompactMode: true;
    supportsFullMode: true;
  };
}

function expectedByChangeKind(
  node: VisualDiffChangeNode,
  side: 'before' | 'after'
): boolean {
  if (node.changeKind === 'add') {
    return side === 'after';
  }
  if (node.changeKind === 'remove') {
    return side === 'before';
  }
  return true;
}

function missingReasonOf(
  expected: boolean,
  path?: string,
  sourcePath?: string
): VisualDiffNavigationMissingReason | null {
  if (!expected) {
    return 'not-applicable';
  }
  if (path && sourcePath) {
    return null;
  }
  if (!path && !sourcePath) {
    return 'missing-path-and-source-ref';
  }
  if (!path) {
    return 'missing-path';
  }
  return 'missing-source-ref';
}

function fallbackTextOf(
  side: 'before' | 'after',
  reason: VisualDiffNavigationMissingReason | null
): string {
  if (reason === null) {
    return '';
  }
  const label = side === 'before' ? 'before' : 'after';
  switch (reason) {
    case 'not-applicable':
      return `No ${label} source exists for this change.`;
    case 'missing-path':
      return `${label} source path is unavailable.`;
    case 'missing-source-ref':
      return `${label} source file is unavailable.`;
    case 'missing-path-and-source-ref':
      return `${label} source link is unavailable.`;
  }
}

function compactVisibilityOf(
  expected: boolean,
  side: 'before' | 'after',
  node: VisualDiffChangeNode
): VisualDiffNavigationCompactVisibility {
  if (!expected) {
    return 'hidden';
  }
  if (node.changeKind === 'add' || node.changeKind === 'remove') {
    return 'primary';
  }
  return side === 'before' ? 'primary' : 'secondary';
}

function buildLink(
  node: VisualDiffChangeNode,
  side: 'before' | 'after'
): VisualDiffNavigationLink {
  const expected = expectedByChangeKind(node, side);
  const path = side === 'before' ? node.beforePath : node.afterPath;
  const sourcePath =
    side === 'before' ? node.evidenceRefs.previousSourcePath : node.evidenceRefs.nextSourcePath;
  const missingReason = missingReasonOf(expected, path, sourcePath);

  return {
    side,
    availability: missingReason === null ? 'available' : 'unavailable',
    label: side === 'before' ? 'Before DSL' : 'After DSL',
    path,
    sourcePath,
    missingReason,
    fallbackText: fallbackTextOf(side, missingReason),
    visibility: {
      compact: compactVisibilityOf(expected, side, node),
      full: missingReason === null ? 'visible' : 'muted',
    },
  };
}

function primarySideOf(
  before: VisualDiffNavigationLink,
  after: VisualDiffNavigationLink
): 'before' | 'after' | 'both' | 'none' {
  const beforeAvailable = before.availability === 'available';
  const afterAvailable = after.availability === 'available';

  if (beforeAvailable && afterAvailable) {
    return 'both';
  }
  if (beforeAvailable) {
    return 'before';
  }
  if (afterAvailable) {
    return 'after';
  }
  return 'none';
}

export function mapVisualDiffNavigation(
  node: VisualDiffChangeNode
): VisualDiffNavigationRule {
  const before = buildLink(node, 'before');
  const after = buildLink(node, 'after');

  return {
    nodeId: node.nodeId,
    changeKind: node.changeKind,
    primarySide: primarySideOf(before, after),
    before,
    after,
  };
}

export function buildVisualDiffNavigationModel(
  viewModel: VisualDiffViewModel
): VisualDiffNavigationModel {
  return {
    kind: 'visual-diff-navigation/v0',
    items: viewModel.items.map(mapVisualDiffNavigation),
    metadata: {
      totalItems: viewModel.items.length,
      supportsCompactMode: true,
      supportsFullMode: true,
    },
  };
}
