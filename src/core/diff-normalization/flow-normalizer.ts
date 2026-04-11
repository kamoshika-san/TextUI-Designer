import type { NavigationFlowDSL } from '../../domain/dsl-types';
import {
  createFlowScreenKey,
  createNormalizedFlowDiffDocument,
  type FlowDiffCompareDocument,
  type FlowDiffEvent,
  type FlowDiffNormalizationResult
} from '../textui-core-diff';

function sortByPath<T extends { path: string }>(values: T[]): T[] {
  return [...values].sort((a, b) => a.path.localeCompare(b.path));
}

function sortStrings(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function areStringArraysEqual(left?: string[], right?: string[]): boolean {
  if (left === right) {
    return true;
  }
  if (!left || !right || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(item => stableStringify(item)).join(',')}]`;
  }
  if (!value || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`)
    .join(',')}}`;
}

function isEqualValue(left: unknown, right: unknown): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && areStringArraysEqual(left, right);
  }

  if (left && right && typeof left === 'object' && typeof right === 'object') {
    return stableStringify(left) === stableStringify(right);
  }

  return left === right;
}

function collectFlowUpdateEvents(previous: FlowDiffCompareDocument, next: FlowDiffCompareDocument): FlowDiffEvent[] {
  const events: FlowDiffEvent[] = [];
  const comparableFields: Array<'id' | 'title' | 'entry' | 'version' | 'loopPolicy' | 'terminalScreensRequired'> = [
    'id',
    'title',
    'entry',
    'version',
    'loopPolicy',
    'terminalScreensRequired'
  ];

  for (const field of comparableFields) {
    const previousValue = previous.flow[field];
    const nextValue = next.flow[field];
    if (previousValue !== nextValue) {
      events.push({
        kind: 'update',
        entity: 'flow',
        field,
        prev: previousValue,
        next: nextValue
      });
    }
  }

  return events;
}

function collectScreenEvents(previous: FlowDiffCompareDocument, next: FlowDiffCompareDocument): FlowDiffEvent[] {
  const previousById = new Map(previous.screens.map(screen => [createFlowScreenKey(screen), screen]));
  const nextById = new Map(next.screens.map(screen => [createFlowScreenKey(screen), screen]));
  const events: FlowDiffEvent[] = [];

  for (const key of sortStrings([...previousById.keys()])) {
    if (!nextById.has(key)) {
      events.push({
        kind: 'remove',
        entity: 'screen',
        def: previousById.get(key)!
      });
    }
  }

  for (const key of sortStrings([...nextById.keys()])) {
    if (!previousById.has(key)) {
      events.push({
        kind: 'add',
        entity: 'screen',
        def: nextById.get(key)!
      });
      continue;
    }

    const previousScreen = previousById.get(key)!;
    const nextScreen = nextById.get(key)!;
    const comparableFields: Array<'page' | 'title' | 'kind' | 'tags' | 'terminal'> = ['page', 'title', 'kind', 'tags', 'terminal'];

    for (const field of comparableFields) {
      if (!isEqualValue(previousScreen[field], nextScreen[field])) {
        events.push({
          kind: 'update',
          entity: 'screen',
          field,
          def: nextScreen,
          prev: previousScreen[field],
          next: nextScreen[field]
        });
      }
    }
  }

  return events;
}

function collectTransitionEvents(previous: FlowDiffCompareDocument, next: FlowDiffCompareDocument): FlowDiffEvent[] {
  const previousByKey = new Map(previous.transitions.map(transition => [transition.key, transition]));
  const nextByKey = new Map(next.transitions.map(transition => [transition.key, transition]));
  const events: FlowDiffEvent[] = [];

  for (const key of sortStrings([...previousByKey.keys()])) {
    if (!nextByKey.has(key)) {
      events.push({
        kind: 'remove',
        entity: 'transition',
        def: previousByKey.get(key)!
      });
    }
  }

  for (const key of sortStrings([...nextByKey.keys()])) {
    if (!previousByKey.has(key)) {
      events.push({
        kind: 'add',
        entity: 'transition',
        def: nextByKey.get(key)!
      });
      continue;
    }

    const previousTransition = previousByKey.get(key)!;
    const nextTransition = nextByKey.get(key)!;
    const comparableFields: Array<'from' | 'to' | 'trigger' | 'label' | 'condition' | 'params' | 'kind' | 'tags' | 'guard'> = [
      'from',
      'to',
      'trigger',
      'label',
      'condition',
      'params',
      'kind',
      'tags',
      'guard'
    ];

    for (const field of comparableFields) {
      if (!isEqualValue(previousTransition[field], nextTransition[field])) {
        events.push({
          kind: 'update',
          entity: 'transition',
          field,
          def: nextTransition,
          prev: previousTransition[field],
          next: nextTransition[field]
        });
      }
    }
  }

  return events;
}

export function normalizeFlowDiff(options: {
  previousDsl: NavigationFlowDSL;
  nextDsl: NavigationFlowDSL;
  previousSourcePath?: string;
  nextSourcePath?: string;
}): FlowDiffNormalizationResult {
  const previous = createNormalizedFlowDiffDocument(options.previousDsl, {
    side: 'previous',
    sourcePath: options.previousSourcePath
  });
  const next = createNormalizedFlowDiffDocument(options.nextDsl, {
    side: 'next',
    sourcePath: options.nextSourcePath
  });

  previous.screens = sortByPath(previous.screens);
  previous.transitions = sortByPath(previous.transitions);
  next.screens = sortByPath(next.screens);
  next.transitions = sortByPath(next.transitions);

  const events = [
    ...collectFlowUpdateEvents(previous, next),
    ...collectScreenEvents(previous, next),
    ...collectTransitionEvents(previous, next)
  ];

  return {
    previous,
    next,
    events,
    metadata: {
      compareStage: 'd1-flow-normalizer',
      eventCount: events.length
    }
  };
}
