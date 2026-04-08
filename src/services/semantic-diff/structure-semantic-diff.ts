import type {
  AddComponent,
  MoveComponent,
  RemoveComponent,
  SemanticAmbiguityReason,
  SemanticChange,
  SemanticDiffIRNode,
  SemanticDiffIRRoot,
  SemanticIdentityBasis
} from '../../types/semantic-diff';

interface FlatNodeRecord {
  node: SemanticDiffIRNode;
  parentId?: string;
  position: number;
  sourcePath: string;
}

interface NodeMatch {
  previous: FlatNodeRecord;
  next: FlatNodeRecord;
  identityBasis: SemanticIdentityBasis;
}

function flattenNodes(root: SemanticDiffIRRoot): FlatNodeRecord[] {
  const flattened: FlatNodeRecord[] = [];

  const visit = (node: SemanticDiffIRNode): void => {
    node.children.forEach((child, index) => {
      flattened.push({
        node: child,
        parentId: node.nodeId,
        position: index,
        sourcePath: child.sourceRef?.entityPath ?? child.nodeId
      });
      visit(child);
    });
  };

  root.screens.forEach(screen => {
    visit(screen.rootNode);
  });

  return flattened;
}

function getStableKey(record: FlatNodeRecord): string | undefined {
  if (!record.node.stableId) {
    return undefined;
  }

  return `${record.node.screenKey}:${record.node.componentKind}:${record.node.stableId}`;
}

function groupByStableKey(records: FlatNodeRecord[]): Map<string, FlatNodeRecord[]> {
  const grouped = new Map<string, FlatNodeRecord[]>();

  records.forEach(record => {
    const key = getStableKey(record);
    if (!key) {
      return;
    }

    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(record);
      return;
    }

    grouped.set(key, [record]);
  });

  return grouped;
}

function comparePaths(left: FlatNodeRecord, right: FlatNodeRecord): number {
  return left.sourcePath.localeCompare(right.sourcePath);
}

function matchNodes(previousNodes: FlatNodeRecord[], nextNodes: FlatNodeRecord[]): {
  matches: NodeMatch[];
  previousUnmatched: FlatNodeRecord[];
  nextUnmatched: FlatNodeRecord[];
  ambiguousPrevious: Map<string, SemanticAmbiguityReason>;
  ambiguousNext: Map<string, SemanticAmbiguityReason>;
} {
  const previousRemaining = [...previousNodes];
  const nextRemaining = [...nextNodes];
  const matches: NodeMatch[] = [];
  const ambiguousPrevious = new Map<string, SemanticAmbiguityReason>();
  const ambiguousNext = new Map<string, SemanticAmbiguityReason>();

  const previousStable = groupByStableKey(previousNodes);
  const nextStable = groupByStableKey(nextNodes);
  const allStableKeys = new Set([...previousStable.keys(), ...nextStable.keys()]);

  allStableKeys.forEach(key => {
    const previousBucket = previousStable.get(key) ?? [];
    const nextBucket = nextStable.get(key) ?? [];

    if (previousBucket.length === 1 && nextBucket.length === 1) {
      const previous = previousBucket[0];
      const next = nextBucket[0];

      matches.push({
        previous,
        next,
        identityBasis: 'stable-id'
      });

      previousRemaining.splice(previousRemaining.indexOf(previous), 1);
      nextRemaining.splice(nextRemaining.indexOf(next), 1);
      return;
    }

    if (previousBucket.length + nextBucket.length > 1) {
      previousBucket.forEach(record => ambiguousPrevious.set(record.node.nodeId, 'multiple-candidates'));
      nextBucket.forEach(record => ambiguousNext.set(record.node.nodeId, 'multiple-candidates'));
    }
  });

  const previousByPath = new Map<string, FlatNodeRecord>();
  previousRemaining.forEach(record => {
    previousByPath.set(`${record.node.componentKind}:${record.sourcePath}`, record);
  });

  [...nextRemaining].forEach(nextRecord => {
    const key = `${nextRecord.node.componentKind}:${nextRecord.sourcePath}`;
    const previousRecord = previousByPath.get(key);
    if (!previousRecord) {
      return;
    }

    matches.push({
      previous: previousRecord,
      next: nextRecord,
      identityBasis: 'owner-path'
    });

    previousRemaining.splice(previousRemaining.indexOf(previousRecord), 1);
    nextRemaining.splice(nextRemaining.indexOf(nextRecord), 1);
    previousByPath.delete(key);
  });

  previousRemaining.sort(comparePaths);
  nextRemaining.sort(comparePaths);
  matches.sort((left, right) => left.previous.sourcePath.localeCompare(right.previous.sourcePath));

  return {
    matches,
    previousUnmatched: previousRemaining,
    nextUnmatched: nextRemaining,
    ambiguousPrevious,
    ambiguousNext
  };
}

function buildMoveChange(match: NodeMatch): MoveComponent | null {
  const parentChanged = match.previous.parentId !== match.next.parentId;
  const positionChanged = match.previous.position !== match.next.position;

  if (!parentChanged && !positionChanged) {
    return null;
  }

  return {
    type: 'MoveComponent',
    layer: 'structure',
    componentId: match.next.node.nodeId,
    identityBasis: match.identityBasis,
    evidence: {
      previous: match.previous.node.sourceRef,
      next: match.next.node.sourceRef
    },
    fromParentId: match.previous.parentId,
    toParentId: match.next.parentId,
    fromPosition: match.previous.position,
    toPosition: match.next.position
  };
}

function buildRemoveChange(
  record: FlatNodeRecord,
  ambiguityReason?: SemanticAmbiguityReason
): RemoveComponent {
  return {
    type: 'RemoveComponent',
    layer: 'structure',
    componentId: record.node.nodeId,
    identityBasis: record.node.stableId ? 'stable-id' : 'fallback',
    ambiguityReason,
    evidence: {
      previous: record.node.sourceRef
    },
    parentId: record.parentId,
    componentKind: record.node.componentKind
  };
}

function buildAddChange(
  record: FlatNodeRecord,
  ambiguityReason?: SemanticAmbiguityReason
): AddComponent {
  return {
    type: 'AddComponent',
    layer: 'structure',
    componentId: record.node.nodeId,
    identityBasis: record.node.stableId ? 'stable-id' : 'fallback',
    ambiguityReason,
    evidence: {
      next: record.node.sourceRef
    },
    parentId: record.parentId,
    position: record.position,
    componentKind: record.node.componentKind
  };
}

function compareChanges(left: SemanticChange, right: SemanticChange): number {
  const typeOrder: Record<SemanticChange['type'], number> = {
    AddComponent: 0,
    RemoveComponent: 1,
    MoveComponent: 2,
    UpdateProps: 3,
    UpdateLayout: 4,
    UpdateStyle: 5,
    UpdateCondition: 6,
    UpdateEvent: 7,
    UpdateBinding: 8
  };

  const typeDiff = typeOrder[left.type] - typeOrder[right.type];
  if (typeDiff !== 0) {
    return typeDiff;
  }

  return left.componentId.localeCompare(right.componentId);
}

export function computeStructureSemanticChanges(
  previous: SemanticDiffIRRoot,
  next: SemanticDiffIRRoot
): SemanticChange[] {
  const previousNodes = flattenNodes(previous);
  const nextNodes = flattenNodes(next);
  const { matches, previousUnmatched, nextUnmatched, ambiguousPrevious, ambiguousNext } = matchNodes(
    previousNodes,
    nextNodes
  );

  const changes: SemanticChange[] = [];

  matches.forEach(match => {
    const moveChange = buildMoveChange(match);
    if (moveChange) {
      changes.push(moveChange);
    }
  });

  previousUnmatched.forEach(record => {
    changes.push(buildRemoveChange(record, ambiguousPrevious.get(record.node.nodeId)));
  });

  nextUnmatched.forEach(record => {
    changes.push(buildAddChange(record, ambiguousNext.get(record.node.nodeId)));
  });

  return changes.sort(compareChanges);
}
