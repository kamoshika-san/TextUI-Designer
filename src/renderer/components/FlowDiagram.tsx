import React from 'react';
import type { NavigationFlowDSL, ScreenRef } from '../../domain/dsl-types';
import type { FlowDiffVisualStatus } from '../../services/semantic-diff';
import { createFlowTransitionStateKey } from '../../services/semantic-diff';
import { FlowNode } from './FlowNode';
import { FlowEdge } from './FlowEdge';

interface FlowDiagramProps {
  flowDsl: NavigationFlowDSL;
  selectedScreenId: string;
  onSelectScreen: (screenId: string) => void;
  screenStates?: Record<string, FlowDiffVisualStatus>;
  transitionStates?: Record<string, FlowDiffVisualStatus>;
}

export const FlowDiagram: React.FC<FlowDiagramProps> = ({
  flowDsl,
  selectedScreenId,
  onSelectScreen,
  screenStates,
  transitionStates
}) => {
  const screenDepths = computeScreenDepths(flowDsl);
  const selectedPath = computeSelectedPath(selectedScreenId, flowDsl);
  const visibleTransitions = computeVisibleTransitions(selectedScreenId, flowDsl, selectedPath);
  const isFilteredConnections = selectedScreenId !== '' && selectedScreenId !== flowDsl.flow.entry;

  const maxDepth = Math.max(0, ...Array.from(screenDepths.values()));
  const columns: ScreenRef[][] = Array.from({ length: maxDepth + 1 }, () => []);
  flowDsl.flow.screens.forEach(screen => {
    const depth = screenDepths.get(screen.id) ?? 0;
    columns[depth].push(screen);
  });

  const screenTitleMap = new Map(flowDsl.flow.screens.map(s => [s.id, s.title || s.id]));

  return (
    <div className="textui-flow-diagram">
      <div className="textui-flow-diagram-map">
        <div className="textui-flow-diagram-columns">
          {columns.map((col, depth) => (
            <div key={depth} className="textui-flow-diagram-col">
              {col.map(screen => (
                <FlowNode
                  key={screen.id}
                  screen={screen}
                  isEntry={screen.id === flowDsl.flow.entry}
                  isSelected={screen.id === selectedScreenId}
                  isOnSelectedPath={selectedPath.has(screen.id)}
                  visualStatus={screenStates?.[screen.id] ?? 'unchanged'}
                  onSelect={onSelectScreen}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      {visibleTransitions.length > 0 ? (
        <div className="textui-flow-diagram-connections">
          <div className="textui-flow-diagram-connections-heading">
            {isFilteredConnections ? `Connections on route (${visibleTransitions.length})` : 'Connections'}
          </div>
          {visibleTransitions.map((transition, index) => (
            <FlowEdge
              key={`${transition.from}-${transition.to}-${transition.trigger}-${index}`}
              transition={transition}
              fromTitle={screenTitleMap.get(transition.from) ?? transition.from}
              toTitle={screenTitleMap.get(transition.to) ?? transition.to}
              isOnSelectedPath={selectedPath.has(transition.from) && selectedPath.has(transition.to)}
              visualStatus={transitionStates?.[createFlowTransitionStateKey(transition)] ?? 'unchanged'}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
};

function computeScreenDepths(flowDsl: NavigationFlowDSL): Map<string, number> {
  const adjacency = new Map<string, string[]>();
  const depths = new Map<string, number>();
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: flowDsl.flow.entry, depth: 0 }];

  flowDsl.flow.screens.forEach(screen => adjacency.set(screen.id, []));
  flowDsl.flow.transitions.forEach(transition => {
    adjacency.get(transition.from)?.push(transition.to);
  });

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current.id)) {
      continue;
    }

    visited.add(current.id);
    depths.set(current.id, current.depth);

    for (const next of adjacency.get(current.id) ?? []) {
      if (!visited.has(next)) {
        queue.push({ id: next, depth: current.depth + 1 });
      }
    }
  }

  flowDsl.flow.screens.forEach(screen => {
    if (!depths.has(screen.id)) {
      depths.set(screen.id, 0);
    }
  });

  return depths;
}

function computeVisibleTransitions(
  selectedScreenId: string,
  flowDsl: NavigationFlowDSL,
  selectedPath: Set<string>
) {
  if (!selectedScreenId || selectedScreenId === flowDsl.flow.entry) {
    return flowDsl.flow.transitions;
  }

  return flowDsl.flow.transitions.filter(transition => (
    selectedPath.has(transition.from) && selectedPath.has(transition.to)
  ));
}

function computeSelectedPath(selectedScreenId: string, flowDsl: NavigationFlowDSL): Set<string> {
  if (!selectedScreenId || selectedScreenId === flowDsl.flow.entry) {
    return new Set([flowDsl.flow.entry]);
  }

  const adjacency = new Map<string, string[]>();
  flowDsl.flow.screens.forEach(screen => adjacency.set(screen.id, []));
  flowDsl.flow.transitions.forEach(transition => {
    adjacency.get(transition.from)?.push(transition.to);
  });

  // BFS to find shortest path from entry to selectedScreenId
  const parent = new Map<string, string | null>();
  parent.set(flowDsl.flow.entry, null);
  const queue = [flowDsl.flow.entry];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === selectedScreenId) break;
    for (const next of adjacency.get(current) ?? []) {
      if (!parent.has(next)) {
        parent.set(next, current);
        queue.push(next);
      }
    }
  }

  const path = new Set<string>();
  if (!parent.has(selectedScreenId)) {
    path.add(selectedScreenId);
    return path;
  }

  let cursor: string | null | undefined = selectedScreenId;
  while (cursor != null) {
    path.add(cursor);
    cursor = parent.get(cursor);
  }
  return path;
}
