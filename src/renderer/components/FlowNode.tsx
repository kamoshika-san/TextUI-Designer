import React from 'react';
import type { ScreenRef } from '../../domain/dsl-types';

interface FlowNodeProps {
  screen: ScreenRef;
  isEntry: boolean;
  depth: number;
}

export const FlowNode: React.FC<FlowNodeProps> = ({ screen, isEntry, depth }) => {
  return (
    <div
      className={isEntry ? 'textui-flow-node is-entry' : 'textui-flow-node'}
      style={{ ['--textui-flow-depth' as string]: depth } as React.CSSProperties}
      data-screen-id={screen.id}
    >
      <div className="textui-flow-node-kicker">{isEntry ? 'Entry' : 'Screen'}</div>
      <div className="textui-flow-node-title">{screen.title || screen.id}</div>
      <div className="textui-flow-node-meta">
        <span className="textui-flow-node-id">{screen.id}</span>
        <span className="textui-flow-node-page">{screen.page}</span>
      </div>
    </div>
  );
};
