import React, { useEffect, useMemo, useState } from 'react';
import type { NavigationFlowDSL } from '../../domain/dsl-types';
import { FlowDiagram } from './FlowDiagram';

interface FlowPreviewPanelProps {
  flowDsl: NavigationFlowDSL;
  onJumpToDsl: (dslPath: string, componentName: string, targetFilePath?: string) => void;
}

export const FlowPreviewPanel: React.FC<FlowPreviewPanelProps> = ({ flowDsl, onJumpToDsl }) => {
  const initialScreenId = flowDsl.flow.entry || flowDsl.flow.screens[0]?.id || '';
  const [selectedScreenId, setSelectedScreenId] = useState(initialScreenId);

  useEffect(() => {
    setSelectedScreenId(initialScreenId);
  }, [initialScreenId]);

  const selectedScreen = useMemo(
    () => flowDsl.flow.screens.find(screen => screen.id === selectedScreenId) ?? flowDsl.flow.screens[0],
    [flowDsl, selectedScreenId]
  );
  const selectedScreenIndex = selectedScreen
    ? flowDsl.flow.screens.findIndex(screen => screen.id === selectedScreen.id)
    : -1;
  const outgoingTransitions = selectedScreen
    ? flowDsl.flow.transitions.filter(transition => transition.from === selectedScreen.id)
    : [];

  return (
    <section className="textui-flow-preview">
      <header className="textui-flow-preview-header">
        <div>
          <div className="textui-flow-preview-eyebrow">Navigation Flow</div>
          <h1 className="textui-flow-preview-title">{flowDsl.flow.title}</h1>
          <div className="textui-flow-preview-meta">
            <span>Flow ID: {flowDsl.flow.id}</span>
            <span>Entry: {flowDsl.flow.entry}</span>
            <span>Screens: {flowDsl.flow.screens.length}</span>
            <span>Transitions: {flowDsl.flow.transitions.length}</span>
          </div>
        </div>
      </header>
      {selectedScreen ? (
        <section className="textui-flow-preview-context" aria-label="Selected page preview context">
          <div className="textui-flow-preview-context-kicker">Page Preview Context</div>
          <div className="textui-flow-preview-context-title">{selectedScreen.title || selectedScreen.id}</div>
          <div className="textui-flow-preview-context-meta">
            <span>Screen ID: {selectedScreen.id}</span>
            <span>Page: {selectedScreen.page}</span>
            <span>Outgoing: {outgoingTransitions.length}</span>
          </div>
          <div className="textui-flow-preview-context-actions">
            <button
              type="button"
              onClick={() => onJumpToDsl(`/flow/screens/${selectedScreenIndex}`, 'FlowScreen')}
            >
              Jump to flow screen
            </button>
            <button
              type="button"
              onClick={() => onJumpToDsl('/page', 'ScreenPage', selectedScreen.page)}
            >
              Open linked page
            </button>
          </div>
        </section>
      ) : null}
      <FlowDiagram
        flowDsl={flowDsl}
        selectedScreenId={selectedScreenId}
        onSelectScreen={setSelectedScreenId}
        onJumpToFlowDsl={(screenId) => {
          const screenIndex = flowDsl.flow.screens.findIndex(screen => screen.id === screenId);
          if (screenIndex >= 0) {
            onJumpToDsl(`/flow/screens/${screenIndex}`, 'FlowScreen');
          }
        }}
        onJumpToPageDsl={(pagePath) => onJumpToDsl('/page', 'ScreenPage', pagePath)}
      />
    </section>
  );
};
