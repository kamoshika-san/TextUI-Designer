import React from 'react';
import type { TransitionDef } from '../../domain/dsl-types';
import type { FlowDiffVisualStatus } from '../../services/semantic-diff';

interface FlowEdgeProps {
  transition: TransitionDef;
  visualStatus?: FlowDiffVisualStatus;
}

export const FlowEdge: React.FC<FlowEdgeProps> = ({ transition, visualStatus = 'unchanged' }) => {
  return (
    <div className={['textui-flow-edge', visualStatus !== 'unchanged' ? `is-${visualStatus}` : ''].filter(Boolean).join(' ')}>
      <div className="textui-flow-edge-route">
        <span className="textui-flow-edge-screen">{transition.from}</span>
        <span className="textui-flow-edge-arrow" aria-hidden="true">-&gt;</span>
        <span className="textui-flow-edge-screen">{transition.to}</span>
      </div>
      <div className="textui-flow-edge-labels">
        <span className="textui-flow-edge-trigger">{transition.trigger}</span>
        {transition.label ? <span className="textui-flow-edge-caption">{transition.label}</span> : null}
        {visualStatus !== 'unchanged' ? <span className="textui-flow-edge-status">{visualStatus.toUpperCase()}</span> : null}
      </div>
    </div>
  );
};
