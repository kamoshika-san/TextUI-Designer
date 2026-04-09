import React from 'react';
import type { NavigationFlowDSL } from '../../domain/dsl-types';
import { FlowNode } from './FlowNode';
import { FlowEdge } from './FlowEdge';

interface FlowDiagramProps {
  flowDsl: NavigationFlowDSL;
  selectedScreenId: string;
  onSelectScreen: (screenId: string) => void;
  onJumpToFlowDsl: (screenId: string) => void;
  onJumpToPageDsl: (pagePath: string) => void;
}

export const FlowDiagram: React.FC<FlowDiagramProps> = ({
  flowDsl,
  selectedScreenId,
  onSelectScreen,
  onJumpToFlowDsl,
  onJumpToPageDsl
}) => {
  const screenDepths = computeScreenDepths(flowDsl);

  return (
    <div className="textui-flow-diagram">
      <div className="textui-flow-diagram-nodes">
        {flowDsl.flow.screens.map(screen => (
          <FlowNode
            key={screen.id}
            screen={screen}
            isEntry={screen.id === flowDsl.flow.entry}
            depth={screenDepths.get(screen.id) ?? 0}
            isSelected={screen.id === selectedScreenId}
            onSelect={onSelectScreen}
            onJumpToFlowDsl={onJumpToFlowDsl}
            onJumpToPageDsl={onJumpToPageDsl}
          />
        ))}
      </div>
      <div className="textui-flow-diagram-edges">
        {flowDsl.flow.transitions.map((transition, index) => (
          <FlowEdge key={`${transition.from}-${transition.to}-${transition.trigger}-${index}`} transition={transition} />
        ))}
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
