import React from 'react';
import type { ScreenRef } from '../../domain/dsl-types';
import type { FlowDiffVisualStatus } from '../../services/semantic-diff';

interface FlowNodeProps {
  screen: ScreenRef;
  isEntry: boolean;
  depth: number;
  isSelected: boolean;
  visualStatus: FlowDiffVisualStatus;
  onSelect: (screenId: string) => void;
  onJumpToFlowDsl: (screenId: string) => void;
  onJumpToPageDsl: (pagePath: string) => void;
}

export const FlowNode: React.FC<FlowNodeProps> = ({
  screen,
  isEntry,
  depth,
  isSelected,
  visualStatus,
  onSelect,
  onJumpToFlowDsl,
  onJumpToPageDsl
}) => {
  const className = [
    'textui-flow-node',
    isEntry ? 'is-entry' : '',
    isSelected ? 'is-selected' : '',
    visualStatus !== 'unchanged' ? `is-${visualStatus}` : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={className}
      style={{ ['--textui-flow-depth' as string]: depth } as React.CSSProperties}
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
      <div className="textui-flow-node-kicker">{isEntry ? 'Entry' : 'Screen'}</div>
      {visualStatus !== 'unchanged' ? <div className="textui-flow-node-status">{visualStatus.toUpperCase()}</div> : null}
      <div className="textui-flow-node-title">{screen.title || screen.id}</div>
      <div className="textui-flow-node-meta">
        <span className="textui-flow-node-id">{screen.id}</span>
        <span className="textui-flow-node-page">{screen.page}</span>
      </div>
      <div className="textui-flow-node-actions">
        <button
          type="button"
          className="textui-flow-node-action"
          onClick={(event) => {
            event.stopPropagation();
            onJumpToFlowDsl(screen.id);
          }}
        >
          Jump to flow DSL
        </button>
        <button
          type="button"
          className="textui-flow-node-action"
          onClick={(event) => {
            event.stopPropagation();
            onJumpToPageDsl(screen.page);
          }}
        >
          Open page DSL
        </button>
      </div>
    </div>
  );
};
