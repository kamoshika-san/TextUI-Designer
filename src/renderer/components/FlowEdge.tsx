import React from 'react';
import type { TransitionDef } from '../../domain/dsl-types';

interface FlowEdgeProps {
  transition: TransitionDef;
}

export const FlowEdge: React.FC<FlowEdgeProps> = ({ transition }) => {
  return (
    <div className="textui-flow-edge">
      <div className="textui-flow-edge-route">
        <span className="textui-flow-edge-screen">{transition.from}</span>
        <span className="textui-flow-edge-arrow" aria-hidden="true">→</span>
        <span className="textui-flow-edge-screen">{transition.to}</span>
      </div>
      <div className="textui-flow-edge-labels">
        <span className="textui-flow-edge-trigger">{transition.trigger}</span>
        {transition.label ? <span className="textui-flow-edge-caption">{transition.label}</span> : null}
      </div>
    </div>
  );
};
