import React from 'react';
import type { TransitionDef } from '../../domain/dsl-types';
import type { FlowDiffVisualStatus } from '../../services/semantic-diff';

interface FlowEdgeProps {
  transition: TransitionDef;
  fromTitle: string;
  toTitle: string;
  isOnSelectedPath: boolean;
  visualStatus?: FlowDiffVisualStatus;
}

export const FlowEdge: React.FC<FlowEdgeProps> = ({
  transition,
  fromTitle,
  toTitle,
  isOnSelectedPath,
  visualStatus = 'unchanged'
}) => {
  return (
    <div
      className={[
        'textui-flow-edge',
        isOnSelectedPath ? 'is-on-path' : '',
        visualStatus !== 'unchanged' ? `is-${visualStatus}` : ''
      ].filter(Boolean).join(' ')}
    >
      <span className="textui-flow-edge-from">{fromTitle}</span>
      <span className="textui-flow-edge-arrow" aria-hidden="true">→</span>
      <span className="textui-flow-edge-to">{toTitle}</span>
      <span className="textui-flow-edge-trigger">{transition.trigger}</span>
      {transition.label ? <span className="textui-flow-edge-label">{transition.label}</span> : null}
      {visualStatus !== 'unchanged' ? (
        <span className={`textui-flow-edge-status is-${visualStatus}`}>{visualStatus.toUpperCase()}</span>
      ) : null}
    </div>
  );
};
