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

function collectFlowUpdateEvents(previous: FlowDiffCompareDocument, next: FlowDiffCompareDocument): FlowDiffEvent[] {
  const events: FlowDiffEvent[] = [];
  const comparableFields: Array<'id' | 'title' | 'entry'> = ['id', 'title', 'entry'];

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
