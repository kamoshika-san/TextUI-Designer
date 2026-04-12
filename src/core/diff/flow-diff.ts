import type {
  DiffCompareSide,
  FlowDiffCompareDocument,
  FlowDiffScreenRef,
  FlowDiffTransitionRef,
} from './diff-types';
import type {
  NavigationFlowDSL,
  ScreenRef,
  TransitionDef,
} from '../../domain/dsl-types';

export function createNormalizedFlowDiffDocument(
  normalizedDsl: NavigationFlowDSL,
  options: {
    side: DiffCompareSide;
    sourcePath?: string;
  }
): FlowDiffCompareDocument {
  return {
    side: options.side,
    normalizedDsl,
    flow: {
      id: normalizedDsl.flow.id,
      title: normalizedDsl.flow.title,
      entry: normalizedDsl.flow.entry,
      version: normalizedDsl.flow.version ?? '1',
      loopPolicy: normalizedDsl.flow.policy?.loops ?? 'deny',
      terminalScreensRequired: normalizedDsl.flow.policy?.terminalScreensRequired ?? false,
      screenCount: normalizedDsl.flow.screens.length,
      transitionCount: normalizedDsl.flow.transitions.length
    },
    screens: normalizedDsl.flow.screens.map((screen, index) => ({
      id: screen.id,
      page: screen.page,
      title: screen.title,
      kind: screen.kind,
      tags: screen.tags,
      terminal: screen.terminal,
      path: `/flow/screens/${index}`
    })),
    transitions: normalizedDsl.flow.transitions.map((transition, index) => ({
      key: createFlowTransitionKey(transition),
      id: transition.id,
      from: transition.from,
      to: transition.to,
      trigger: transition.trigger,
      label: transition.label,
      condition: transition.condition,
      params: transition.params,
      kind: transition.kind,
      tags: transition.tags,
      guard: transition.guard,
      path: `/flow/transitions/${index}`
    })),
    metadata: {
      sourcePath: options.sourcePath,
      normalizationState: 'normalized-flow',
      sourceRefPolicy: 'preserved',
      explicitnessPolicy: 'preserved',
      ownershipPolicy: 'preserved'
    }
  };
}

export function createFlowTransitionKey(transition: Pick<TransitionDef, 'id' | 'from' | 'to' | 'trigger'>): string {
  return transition.id ?? `${transition.from}::${transition.trigger}::${transition.to}`;
}

export function createFlowScreenKey(screen: Pick<ScreenRef, 'id'>): string {
  return screen.id;
}
