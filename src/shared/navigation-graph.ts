import type {
  NavigationFlowDSL,
  NavigationTerminalKind,
  ScreenRef,
  TransitionDef
} from '../domain/dsl-types';

export interface NavigationGraphEdge {
  id: string;
  index: number;
  from: string;
  to: string;
  trigger: string;
  transition: TransitionDef;
}

export interface NavigationRouteResult {
  screenIds: string[];
  transitionIds: string[];
}

export interface NavigationGraph {
  dsl: NavigationFlowDSL;
  screenById: Map<string, ScreenRef>;
  edgeById: Map<string, NavigationGraphEdge>;
  adjacency: Map<string, NavigationGraphEdge[]>;
  reverseAdjacency: Map<string, NavigationGraphEdge[]>;
  terminalScreenIds: Set<string>;
}

export function buildNavigationGraph(dsl: NavigationFlowDSL): NavigationGraph {
  const screenById = new Map<string, ScreenRef>();
  const adjacency = new Map<string, NavigationGraphEdge[]>();
  const reverseAdjacency = new Map<string, NavigationGraphEdge[]>();
  const edgeById = new Map<string, NavigationGraphEdge>();
  const terminalScreenIds = new Set<string>();

  for (const screen of dsl.flow.screens) {
    if (!screenById.has(screen.id)) {
      screenById.set(screen.id, screen);
    }
    adjacency.set(screen.id, adjacency.get(screen.id) ?? []);
    reverseAdjacency.set(screen.id, reverseAdjacency.get(screen.id) ?? []);

    if (screen.terminal) {
      terminalScreenIds.add(screen.id);
    }
  }

  dsl.flow.transitions.forEach((transition, index) => {
    const id = transition.id ?? createNavigationTransitionId(transition);
    const edge: NavigationGraphEdge = {
      id,
      index,
      from: transition.from,
      to: transition.to,
      trigger: transition.trigger,
      transition
    };

    edgeById.set(id, edge);

    if (screenById.has(transition.from) && screenById.has(transition.to)) {
      adjacency.get(transition.from)?.push(edge);
      reverseAdjacency.get(transition.to)?.push(edge);
    }
  });

  return {
    dsl,
    screenById,
    edgeById,
    adjacency,
    reverseAdjacency,
    terminalScreenIds
  };
}

export function createNavigationTransitionId(
  transition: Pick<TransitionDef, 'from' | 'trigger' | 'to'>
): string {
  return `${transition.from}::${transition.trigger}::${transition.to}`;
}

export function getTerminalScreenIds(
  graph: NavigationGraph,
  terminalKind?: NavigationTerminalKind
): string[] {
  const terminalIds = [...graph.terminalScreenIds];
  if (!terminalKind) {
    return terminalIds;
  }

  return terminalIds.filter(screenId => graph.screenById.get(screenId)?.terminal?.kind === terminalKind);
}

export function collectReachableScreenIds(
  graph: NavigationGraph,
  entry = graph.dsl.flow.entry
): Set<string> {
  return collectReachableUsing(graph.adjacency, entry);
}

export function collectReverseReachableScreenIds(
  graph: NavigationGraph,
  screenId: string
): Set<string> {
  return collectReachableUsing(graph.reverseAdjacency, screenId);
}

export function findNavigationCycles(graph: NavigationGraph): string[][] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const stack: string[] = [];
  const cycles: string[][] = [];
  const seen = new Set<string>();

  const visit = (node: string): void => {
    visiting.add(node);
    visited.add(node);
    stack.push(node);

    for (const edge of graph.adjacency.get(node) ?? []) {
      const next = edge.to;
      if (!visited.has(next)) {
        visit(next);
        continue;
      }

      if (!visiting.has(next)) {
        continue;
      }

      const start = stack.indexOf(next);
      if (start === -1) {
        continue;
      }

      const cycle = [...stack.slice(start), next];
      const key = normalizeCycle(cycle);
      if (!seen.has(key)) {
        seen.add(key);
        cycles.push(cycle);
      }
    }

    stack.pop();
    visiting.delete(node);
  };

  for (const node of graph.adjacency.keys()) {
    if (!visited.has(node)) {
      visit(node);
    }
  }

  return cycles;
}

export function findShortestNavigationRoute(
  graph: NavigationGraph,
  options: {
    entryId?: string;
    toScreenId?: string;
    toTerminalKind?: NavigationTerminalKind;
  }
): NavigationRouteResult | null {
  const entryId = options.entryId ?? graph.dsl.flow.entry;
  if (!graph.screenById.has(entryId)) {
    return null;
  }

  const targets = new Set<string>();
  if (options.toScreenId) {
    targets.add(options.toScreenId);
  }
  for (const terminalId of getTerminalScreenIds(graph, options.toTerminalKind)) {
    targets.add(terminalId);
  }

  if (targets.size === 0) {
    return null;
  }

  const queue: Array<{ screenId: string; screenIds: string[]; transitionIds: string[] }> = [{
    screenId: entryId,
    screenIds: [entryId],
    transitionIds: []
  }];
  const visited = new Set<string>([entryId]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    if (targets.has(current.screenId)) {
      return {
        screenIds: current.screenIds,
        transitionIds: current.transitionIds
      };
    }

    for (const edge of graph.adjacency.get(current.screenId) ?? []) {
      if (visited.has(edge.to)) {
        continue;
      }

      visited.add(edge.to);
      queue.push({
        screenId: edge.to,
        screenIds: [...current.screenIds, edge.to],
        transitionIds: [...current.transitionIds, edge.id]
      });
    }
  }

  return null;
}

function collectReachableUsing(
  edgesBySource: Map<string, NavigationGraphEdge[]>,
  entry: string
): Set<string> {
  const visited = new Set<string>();
  const queue = [entry];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) {
      continue;
    }

    visited.add(current);
    for (const edge of edgesBySource.get(current) ?? []) {
      const next = edge.to === current ? edge.from : edge.to;
      if (!visited.has(next)) {
        queue.push(next);
      }
    }
  }

  return visited;
}

function normalizeCycle(cycle: string[]): string {
  const loop = cycle.slice(0, -1);
  const rotations = loop.map((_, index) => [...loop.slice(index), ...loop.slice(0, index)].join('->'));
  rotations.sort();
  return rotations[0] ?? cycle.join('->');
}
