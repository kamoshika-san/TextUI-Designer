import React from 'react';
import type { NavigationFlowDSL, ScreenRef } from '../../domain/dsl-types';
import type { FlowDiffVisualStatus } from '../../services/semantic-diff';
import { FlowNode } from './FlowNode';

interface FlowDiagramProps {
  flowDsl: NavigationFlowDSL;
  selectedScreenId: string;
  onSelectScreen: (screenId: string) => void;
  selectedPath: Set<string>;
  screenStates?: Record<string, FlowDiffVisualStatus>;
}

export const FlowDiagram: React.FC<FlowDiagramProps> = ({
  flowDsl,
  selectedScreenId,
  onSelectScreen,
  selectedPath,
  screenStates
}) => {
  const screenDepths = computeScreenDepths(flowDsl);

  const maxDepth = Math.max(0, ...Array.from(screenDepths.values()));
  const columns: ScreenRef[][] = Array.from({ length: maxDepth + 1 }, () => []);
  flowDsl.flow.screens.forEach(screen => {
    const depth = screenDepths.get(screen.id) ?? 0;
    columns[depth].push(screen);
  });

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

export function computeSelectedPath(selectedScreenId: string, flowDsl: NavigationFlowDSL): Set<string> {
  if (!selectedScreenId || selectedScreenId === flowDsl.flow.entry) {
    return new Set([flowDsl.flow.entry]);
  }

  const adjacency = new Map<string, string[]>();
  flowDsl.flow.screens.forEach(screen => adjacency.set(screen.id, []));
  flowDsl.flow.transitions.forEach(transition => {
    adjacency.get(transition.from)?.push(transition.to);
  });

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

export function computeVisibleTransitions(
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
