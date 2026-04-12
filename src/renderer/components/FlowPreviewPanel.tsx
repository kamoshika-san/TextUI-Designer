import React, { useEffect, useMemo, useState } from 'react';
import type { NavigationFlowDSL } from '../../domain/dsl-types';
import type { FlowSemanticDiffResult } from '../../services/semantic-diff';
import { createFlowDiagramDiffState, createFlowTransitionStateKey } from '../../services/semantic-diff';
import { buildNavigationGraph, findAllNavigationRoutes, MAX_NAVIGATION_ROUTES } from '../../shared/navigation-graph';
import { FlowDiagram, computeSelectedPath, computeVisibleTransitions } from './FlowDiagram';
import { FlowEdge } from './FlowEdge';
import { FlowRouteChain } from './FlowRouteChain';

interface FlowPreviewPanelProps {
  flowDsl: NavigationFlowDSL;
  onJumpToDsl: (dslPath: string, componentName: string, targetFilePath?: string) => void;
  diffResult?: FlowSemanticDiffResult;
  initialSelectedScreenId?: string;
}

export const FlowPreviewPanel: React.FC<FlowPreviewPanelProps> = ({
  flowDsl,
  onJumpToDsl,
  diffResult,
  initialSelectedScreenId
}) => {
  const initialScreenId = (
    initialSelectedScreenId &&
    flowDsl.flow.screens.some(screen => screen.id === initialSelectedScreenId)
  )
    ? initialSelectedScreenId
    : flowDsl.flow.entry || flowDsl.flow.screens[0]?.id || '';
  const [selectedScreenId, setSelectedScreenId] = useState(initialScreenId);
  const [routePage, setRoutePage] = useState(0);

  useEffect(() => {
    setSelectedScreenId(initialScreenId);
  }, [initialScreenId]);

  // Reset page when selected screen changes
  useEffect(() => {
    setRoutePage(0);
  }, [selectedScreenId]);

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
  const diagramDiffState = useMemo(
    () => diffResult ? createFlowDiagramDiffState(diffResult) : undefined,
    [diffResult]
  );

  const screenTitleMap = useMemo(
    () => new Map(flowDsl.flow.screens.map(s => [s.id, s.title || s.id])),
    [flowDsl]
  );

  const isEntryScreen = selectedScreen?.id === flowDsl.flow.entry;
  const isFilteredConnections = selectedScreenId !== '' && selectedScreenId !== flowDsl.flow.entry;

  const selectedPath = useMemo(
    () => computeSelectedPath(selectedScreenId, flowDsl),
    [selectedScreenId, flowDsl]
  );

  const visibleTransitions = useMemo(
    () => computeVisibleTransitions(selectedScreenId, flowDsl, selectedPath),
    [selectedScreenId, flowDsl, selectedPath]
  );

  // Route chains for non-entry screens (paginated)
  const routeChains = useMemo(() => {
    if (!isFilteredConnections || !selectedScreenId) {
      return null;
    }
    const graph = buildNavigationGraph(flowDsl);
    return findAllNavigationRoutes(graph, {
      toScreenId: selectedScreenId,
      maxRoutes: (routePage + 1) * MAX_NAVIGATION_ROUTES
    }).slice(routePage * MAX_NAVIGATION_ROUTES);
  }, [flowDsl, selectedScreenId, isFilteredConnections, routePage]);

  const totalRouteCount = useMemo(() => {
    if (!isFilteredConnections || !selectedScreenId) {
      return 0;
    }
    const graph = buildNavigationGraph(flowDsl);
    return findAllNavigationRoutes(graph, {
      toScreenId: selectedScreenId,
      maxRoutes: MAX_NAVIGATION_ROUTES * 200
    }).length;
  }, [flowDsl, selectedScreenId, isFilteredConnections]);

  const totalPages = Math.ceil(totalRouteCount / MAX_NAVIGATION_ROUTES);

  return (
    <section className="textui-flow-preview">
      <header className="textui-flow-preview-header">
        <div className="textui-flow-preview-eyebrow">Navigation Flow</div>
        <h1 className="textui-flow-preview-title">{flowDsl.flow.title}</h1>
        <div className="textui-flow-preview-stats">
          <span className="textui-flow-preview-stat">
            <span className="textui-flow-preview-stat-value">{flowDsl.flow.screens.length}</span>
            <span className="textui-flow-preview-stat-label">screens</span>
          </span>
          <span className="textui-flow-preview-stat">
            <span className="textui-flow-preview-stat-value">{flowDsl.flow.transitions.length}</span>
            <span className="textui-flow-preview-stat-label">transitions</span>
          </span>
          <span className="textui-flow-preview-stat">
            <span className="textui-flow-preview-stat-label">entry</span>
            <span className="textui-flow-preview-stat-value">{flowDsl.flow.entry}</span>
          </span>
          {diagramDiffState?.flowChanged ? (
            <span className="textui-flow-preview-diff-badge">CHANGED</span>
          ) : null}
        </div>
        {diffResult ? (
          <div className="textui-flow-preview-diff-summary">
            {diffResult.summary.added > 0 ? <span className="is-added">+{diffResult.summary.added} ADDED</span> : null}
            {diffResult.summary.removed > 0 ? <span className="is-removed">-{diffResult.summary.removed} REMOVED</span> : null}
            {diffResult.summary.changed > 0 ? <span className="is-changed">{diffResult.summary.changed} CHANGED</span> : null}
          </div>
        ) : null}
      </header>

      <div className="textui-flow-preview-body">
        {/* Top: full-width screen map */}
        <div className="textui-flow-preview-map-area">
          <FlowDiagram
            flowDsl={flowDsl}
            selectedScreenId={selectedScreenId}
            onSelectScreen={setSelectedScreenId}
            selectedPath={selectedPath}
            screenStates={diagramDiffState?.screenStates}
          />
        </div>

        {/* Bottom: two-column row — left: connections/routes, right: screen detail */}
        <div className="textui-flow-preview-detail-row">
          {/* Left column: Connections / Routes to here */}
          <div className="textui-flow-preview-connections-col">
            {isFilteredConnections && routeChains !== null ? (
              <div className="textui-flow-diagram-connections">
                <div className="textui-flow-diagram-connections-heading">
                  {`Routes to here (${totalRouteCount})`}
                </div>
                <FlowRouteChain
                  routes={routeChains}
                  screenTitleMap={screenTitleMap}
                  totalRouteCount={totalRouteCount}
                  currentPage={routePage}
                  totalPages={totalPages}
                  onPageChange={setRoutePage}
                />
              </div>
            ) : visibleTransitions.length > 0 ? (
              <div className="textui-flow-diagram-connections">
                <div className="textui-flow-diagram-connections-heading">
                  Connections
                </div>
                {visibleTransitions.map((transition, index) => (
                  <FlowEdge
                    key={`${transition.from}-${transition.to}-${transition.trigger}-${index}`}
                    transition={transition}
                    fromTitle={screenTitleMap.get(transition.from) ?? transition.from}
                    toTitle={screenTitleMap.get(transition.to) ?? transition.to}
                    isOnSelectedPath={selectedPath.has(transition.from) && selectedPath.has(transition.to)}
                    visualStatus={diagramDiffState?.transitionStates?.[createFlowTransitionStateKey(transition)] ?? 'unchanged'}
                  />
                ))}
              </div>
            ) : null}
          </div>

          {/* Right column: Screen detail */}
          {selectedScreen ? (
            <aside className="textui-flow-preview-stage" aria-label="Selected screen stage">
              <div className="textui-flow-stage-role">
                {isEntryScreen ? 'Entry Screen' : 'Screen'}
              </div>
              <h2 className="textui-flow-stage-title">{selectedScreen.title || selectedScreen.id}</h2>
              {selectedScreen.title ? (
                <div className="textui-flow-stage-id">{selectedScreen.id}</div>
              ) : null}

              <div className="textui-flow-stage-linked-page">
                <span className="textui-flow-stage-linked-page-icon" aria-hidden="true">⬡</span>
                <span className="textui-flow-stage-linked-page-path">{selectedScreen.page}</span>
              </div>

              {outgoingTransitions.length > 0 ? (
                <div className="textui-flow-stage-transitions">
                  <div className="textui-flow-stage-transitions-heading">
                    Outgoing ({outgoingTransitions.length})
                  </div>
                  {outgoingTransitions.map((t, i) => (
                    <div key={`${t.to}-${t.trigger}-${i}`} className="textui-flow-stage-transition-row">
                      <span className="textui-flow-stage-trigger">{t.trigger}</span>
                      <span className="textui-flow-stage-transition-arrow" aria-hidden="true">→</span>
                      <span className="textui-flow-stage-target">{screenTitleMap.get(t.to) ?? t.to}</span>
                      {t.label ? <span className="textui-flow-stage-label">{t.label}</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="textui-flow-stage-transitions">
                  <div className="textui-flow-stage-transitions-heading">Terminal screen</div>
                </div>
              )}

              <div className="textui-flow-stage-actions">
                <button
                  type="button"
                  className="textui-flow-stage-action"
                  onClick={() => onJumpToDsl(`/flow/screens/${selectedScreenIndex}`, 'FlowScreen')}
                >
                  Jump to flow screen
                </button>
                <button
                  type="button"
                  className="textui-flow-stage-action"
                  onClick={() => onJumpToDsl('/page', 'ScreenPage', selectedScreen.page)}
                >
                  Open linked page
                </button>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </section>
  );
};
