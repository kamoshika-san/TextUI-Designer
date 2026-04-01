import type { DiffCompareDocument, DiffEvent } from '../textui-core-diff';
import type { TextUIDSL } from '../../domain/dsl-types';
import { buildThreeWayDiffResult } from './build-three-way-diff';
import { evaluateMergePolicy } from './merge-policy';
import type {
  MergeConflict,
  MergePreviewPatch,
  MergePreviewRequest,
  MergePreviewResponse,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

function areDeepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isComponentWrapper(value: unknown): value is Record<string, Record<string, unknown>> {
  if (!isRecord(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return keys.length === 1 && isRecord(value[keys[0]]);
}

function unwrapComponentWrapper<T>(value: T): T | Record<string, unknown> {
  if (!isComponentWrapper(value)) {
    return value;
  }
  const key = Object.keys(value)[0];
  return value[key];
}

function getPathSegments(path: string): string[] {
  return path.split('/').filter(Boolean);
}

function getChildAtSegment(current: unknown, segment: string): unknown {
  if (segment === 'props') {
    return unwrapComponentWrapper(current);
  }

  if (Array.isArray(current)) {
    const index = Number(segment);
    return Number.isInteger(index) ? current[index] : undefined;
  }

  if (!isRecord(current)) {
    return undefined;
  }

  const container = isComponentWrapper(current) && !(segment in current)
    ? unwrapComponentWrapper(current)
    : current;

  if (!isRecord(container)) {
    return undefined;
  }

  return container[segment];
}

function getParentContainer(root: TextUIDSL, path: string): { container: unknown; key: string } | undefined {
  const segments = getPathSegments(path);
  if (segments.length === 0) {
    return undefined;
  }

  let current: unknown = root;
  for (let index = 0; index < segments.length - 1; index++) {
    current = getChildAtSegment(current, segments[index]);
    if (current === undefined) {
      return undefined;
    }
  }

  return {
    container: current,
    key: segments[segments.length - 1],
  };
}

function readDslValue(document: DiffCompareDocument, path?: string): unknown {
  if (!path) {
    return undefined;
  }

  let current: unknown = document.normalizedDsl;
  for (const segment of getPathSegments(path)) {
    current = getChildAtSegment(current, segment);
    if (current === undefined) {
      return undefined;
    }
  }
  return cloneValue(current);
}

function setDslValue(root: TextUIDSL, path: string, value: unknown): void {
  const location = getParentContainer(root, path);
  if (!location) {
    return;
  }

  const { container, key } = location;
  if (Array.isArray(container)) {
    const index = Number(key);
    if (Number.isInteger(index)) {
      container[index] = cloneValue(value);
    }
    return;
  }

  if (!isRecord(container)) {
    return;
  }

  const target = isComponentWrapper(container) && !(key in container)
    ? unwrapComponentWrapper(container)
    : container;
  if (isRecord(target)) {
    target[key] = cloneValue(value);
  }
}

function deleteDslValue(root: TextUIDSL, path: string): void {
  const location = getParentContainer(root, path);
  if (!location) {
    return;
  }

  const { container, key } = location;
  if (Array.isArray(container)) {
    const index = Number(key);
    if (Number.isInteger(index)) {
      container.splice(index, 1);
    }
    return;
  }

  if (!isRecord(container)) {
    return;
  }

  const target = isComponentWrapper(container) && !(key in container)
    ? unwrapComponentWrapper(container)
    : container;
  if (isRecord(target)) {
    delete target[key];
  }
}

function toPatchOp(kind: DiffEvent['kind']): MergePreviewPatch['op'] {
  switch (kind) {
    case 'add':
      return 'add';
    case 'remove':
      return 'remove';
    default:
      return 'replace';
  }
}

function applyEventToDsl(target: TextUIDSL, event: DiffEvent, diff: { input: { previous: DiffCompareDocument; next: DiffCompareDocument } }): void {
  if (event.entityKind === 'page') {
    return;
  }

  const previousPath = event.trace.previousSourceRef?.entityPath;
  const nextPath = event.trace.nextSourceRef?.entityPath;
  const previousValue = readDslValue(diff.input.previous, previousPath);
  const nextValue = readDslValue(diff.input.next, nextPath);

  if (event.kind !== 'add' && event.kind !== 'remove' && areDeepEqual(previousValue, nextValue)) {
    return;
  }

  switch (event.kind) {
    case 'remove':
      if (previousPath) {
        deleteDslValue(target, previousPath);
      }
      return;
    case 'add':
      if (nextPath) {
        setDslValue(target, nextPath, nextValue);
      }
      return;
    case 'move':
    case 'reorder':
    case 'remove+add':
      if (previousPath) {
        deleteDslValue(target, previousPath);
      }
      if (nextPath) {
        setDslValue(target, nextPath, nextValue);
      }
      return;
    case 'rename':
    case 'update':
    default:
      if (previousPath && nextPath && previousPath !== nextPath) {
        deleteDslValue(target, previousPath);
      }
      if (nextPath) {
        setDslValue(target, nextPath, nextValue);
      }
      return;
  }
}

function buildMergedDsl(request: MergePreviewRequest, threeWayResult: ReturnType<typeof buildThreeWayDiffResult>): TextUIDSL {
  const merged = cloneValue(request.base.normalizedDsl);
  for (const event of threeWayResult.leftDiff.events) {
    applyEventToDsl(merged, event, threeWayResult.leftDiff);
  }
  for (const event of threeWayResult.rightDiff.events) {
    applyEventToDsl(merged, event, threeWayResult.rightDiff);
  }
  return merged;
}

function buildConflictPreviewPatches(conflict: MergeConflict): MergePreviewPatch[] {
  const leftPath = conflict.evidence.left.path;
  const rightPath = conflict.evidence.right.path;
  const primaryPath = rightPath ?? leftPath;
  if (!primaryPath) {
    return [];
  }

  return [{
    path: primaryPath,
    op: toPatchOp(conflict.evidence.right.eventKind),
    from: leftPath ? { path: leftPath, eventId: conflict.evidence.left.eventId } : undefined,
    to: rightPath ? { path: rightPath, eventId: conflict.evidence.right.eventId } : undefined,
  }];
}

export function buildMergePreview(request: MergePreviewRequest): MergePreviewResponse {
  const threeWayResult = buildThreeWayDiffResult(request);
  const policyDecisions = evaluateMergePolicy(threeWayResult.conflicts);
  const conflictsWithPolicy = threeWayResult.conflicts.map((conflict, index) => ({
    ...conflict,
    resolutionHint: policyDecisions[index].decision,
  }));
  const conflicts = request.mode === 'safe-only'
    ? conflictsWithPolicy.filter(conflict => conflict.resolutionHint === 'auto-merge-safe')
    : conflictsWithPolicy;
  const hasManualReviewConflict = policyDecisions.some(decision => decision.decision === 'manual-review-required');

  return {
    mergedDsl: hasManualReviewConflict ? undefined : buildMergedDsl(request, threeWayResult),
    conflicts,
    previewPatches: conflicts.flatMap(buildConflictPreviewPatches),
  };
}
