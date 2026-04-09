import React from 'react';
import type { NavigationFlowDSL } from '../../domain/dsl-types';
import { FlowDiagram } from './FlowDiagram';

interface FlowPreviewPanelProps {
  flowDsl: NavigationFlowDSL;
}

export const FlowPreviewPanel: React.FC<FlowPreviewPanelProps> = ({ flowDsl }) => {
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
      <FlowDiagram flowDsl={flowDsl} />
    </section>
  );
};
