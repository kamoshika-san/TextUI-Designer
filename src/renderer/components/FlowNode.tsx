import React from 'react';
import type { ScreenRef } from '../../domain/dsl-types';
import type { FlowDiffVisualStatus } from '../../services/semantic-diff';

interface FlowNodeProps {
  screen: ScreenRef;
  isEntry: boolean;
  isSelected: boolean;
  isOnSelectedPath: boolean;
  visualStatus: FlowDiffVisualStatus;
  onSelect: (screenId: string) => void;
}

export const FlowNode: React.FC<FlowNodeProps> = ({
  screen,
  isEntry,
  isSelected,
  isOnSelectedPath,
  visualStatus,
  onSelect
}) => {
  const className = [
    'textui-flow-node',
    isEntry ? 'is-entry' : '',
    isSelected ? 'is-selected' : '',
    isOnSelectedPath && !isSelected ? 'is-on-path' : '',
    visualStatus !== 'unchanged' ? `is-${visualStatus}` : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      data-screen-id={screen.id}
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={() => onSelect(screen.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect(screen.id);
        }
      }}
    >
      <div className="textui-flow-node-badges">
        {isEntry ? <span className="textui-flow-node-badge is-entry-badge">Entry</span> : null}
        {visualStatus !== 'unchanged' ? (
          <span className={`textui-flow-node-badge is-diff-badge is-${visualStatus}`}>{visualStatus.toUpperCase()}</span>
        ) : null}
      </div>
      <div className="textui-flow-node-title">{screen.title || screen.id}</div>
      <div className="textui-flow-node-id">{screen.id}</div>
    </div>
  );
};
