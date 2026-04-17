import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeToggle } from './components/ThemeToggle';
import { CustomThemeSelector } from './components/CustomThemeSelector';
import { OverlayDiffViewer } from './components/OverlayDiffViewer';
import { FlowPreviewPanel } from './components/FlowPreviewPanel';
import { PreviewNavBar } from './components/PreviewNavBar';
import type { NavHistoryEntry } from './components/PreviewNavBar';
import { renderRegisteredComponent, registerBuiltInComponents } from './component-map';
import type { NavigationFlowDSL, TextUIDSL, ComponentDef } from '../domain/dsl-types';
import { isNavigationFlowDSL } from '../domain/dsl-types';
import type { VisualDiffResult } from '../domain/diff/visual-diff-model';
import type { ConflictViewResult } from '../domain/diff/conflict-webview-model';
import type { OverlayDiffState } from '../domain/diff/overlay-diff-types';
import { getVSCodeApi } from './vscode-api';
import { createComponentKeys, hashString, mergeDslWithPrevious } from './preview-diff';
import { buildFlowSemanticDiff } from '../services/semantic-diff';
import type { FlowSemanticDiffResult } from '../services/semantic-diff';
import type { ErrorInfo } from './error-guidance';
import { ErrorPanel } from './components/ErrorPanel';
import { ExportButton } from './components/ExportButton';
import { UpdateIndicator } from './components/UpdateIndicator';
import { useWebviewMessages } from './use-webview-messages';
import { attachDevToolsListener } from './devtools-listener';
import { getSharedLayoutStyles } from '../shared/layout-styles';
import type { PreviewUpdateStatus } from './preview-update-status';
import {
  persistJumpToDslOnboardingDismissed,
  shouldShowJumpToDslOnboarding
} from './jump-to-dsl-onboarding';

const vscodeApi = getVSCodeApi();
type PreviewDocument = TextUIDSL | NavigationFlowDSL;

const isDevelopmentMode = Boolean(
  (typeof globalThis !== 'undefined' && (globalThis as { __TUI_DEV_MODE__?: boolean }).__TUI_DEV_MODE__) ||
  window.location.search.includes('textui-dev=true')
);

function isTextUiDsl(value: PreviewDocument | null): value is TextUIDSL {
  return Boolean(value && typeof value === 'object' && 'page' in value);
}

function summarizeExportSourcePath(sourcePath: string | null): { label: string; title?: string } {
  if (!sourcePath) {
    return { label: 'Waiting for preview file' };
  }

  const normalized = sourcePath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  const last = segments.at(-1) ?? normalized;
  const parent = segments.length > 1 ? segments.at(-2) : null;

  return {
    label: parent ? `${parent}/${last}` : last,
    title: sourcePath
  };
}

const App: React.FC = () => {
  const [json, setJson] = useState<PreviewDocument | null>(null);
  const [error, setError] = useState<ErrorInfo | string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<PreviewUpdateStatus>('idle');
  const [lastCompletedAt, setLastCompletedAt] = useState<number | null>(null);
  const [showUpdateIndicator, setShowUpdateIndicator] = useState(true);
  const [diffResult, setDiffResult] = useState<VisualDiffResult | null>(null);
  const [conflictResult, setConflictResult] = useState<ConflictViewResult | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [showJumpToDslHoverIndicator, setShowJumpToDslHoverIndicator] = useState(true);
  const [showJumpToDslOnboarding, setShowJumpToDslOnboarding] = useState(() =>
    shouldShowJumpToDslOnboarding(typeof window !== 'undefined' ? window.localStorage : undefined)
  );
  const [dismissJumpToDslForever, setDismissJumpToDslForever] = useState(false);
  const [overlayDiffState, setOverlayDiffState] = useState<OverlayDiffState | null>(null);
  const [flowDiffResult, setFlowDiffResult] = useState<FlowSemanticDiffResult | null>(null);
  const [returnPath, setReturnPath] = useState<string | null>(null);
  const [previewCurrentScreenId, setPreviewCurrentScreenId] = useState<string | null>(null);
  const [navHistory, setNavHistory] = useState<NavHistoryEntry[]>([]);
  const [exportSourcePath, setExportSourcePath] = useState<string | null>(null);
  const prevComponentsKeysRef = useRef<{ components: ComponentDef[]; keys: string[] } | null>(null);

  useEffect(() => {
    registerBuiltInComponents();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        document.body.classList.add('ctrl-key-down');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        document.body.classList.remove('ctrl-key-down');
      }
    };
    const onBlur = () => {
      document.body.classList.remove('ctrl-key-down');
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    const styleId = 'textui-shared-layout-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = getSharedLayoutStyles();
    document.head.appendChild(styleEl);
  }, []);

  useEffect(() => {
    const styleId = 'textui-update-indicator-styles';
    if (document.getElementById(styleId)) {
      return;
    }
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `
      @keyframes textui-update-indicator-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes textui-update-indicator-fadeout {
        0% { opacity: 1; transform: translateY(0); }
        70% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(0.35rem); }
      }
    `;
    document.head.appendChild(styleEl);
  }, []);

  useEffect(() => {
    if (updateStatus !== 'done') {
      return;
    }
    const timeout = window.setTimeout(() => {
      setUpdateStatus('idle');
    }, 1200);
    return () => window.clearTimeout(timeout);
  }, [updateStatus]);

  const applyDslUpdate = useCallback((incomingDsl: PreviewDocument) => {
    // グローバルに DSL を保持して preview-navigate ハンドラから参照できるようにする（E-NI-S10）
    if (isNavigationFlowDSL(incomingDsl)) {
      (window as unknown as Record<string, unknown>).__textui_flow_dsl__ = incomingDsl;
    } else if (!isNavigationFlowDSL(incomingDsl) && incomingDsl.page?.id) {
      const screenId = incomingDsl.page.id;
      const existing = ((window as unknown as Record<string, unknown>).__textui_screen_dsl_map__ ?? {}) as Record<string, TextUIDSL>;
      (window as unknown as Record<string, unknown>).__textui_screen_dsl_map__ = { ...existing, [screenId]: incomingDsl };
    }

    const startedAt = performance.now();
    const incomingHash = hashString(JSON.stringify(incomingDsl));
    const incomingHashMs = isDevelopmentMode ? performance.now() - startedAt : 0;

    setJson(previousJson => {
      if (!previousJson) {
        if (isDevelopmentMode) {
          const elapsed = performance.now() - startedAt;
          console.debug('[React][diff-render] first render applied', {
            elapsedMs: Number(elapsed.toFixed(2)),
            incomingHashMs: Number(incomingHashMs.toFixed(2)),
            changedCount: isNavigationFlowDSL(incomingDsl) ? incomingDsl.flow.screens.length : incomingDsl.page?.components?.length || 0,
            skipped: false
          });
        }
        return incomingDsl;
      }

      const tPrevStart = isDevelopmentMode ? performance.now() : 0;
      const previousHash = hashString(JSON.stringify(previousJson));
      const previousHashMs = isDevelopmentMode ? performance.now() - tPrevStart : 0;

      if (previousHash === incomingHash) {
        if (isDevelopmentMode) {
          const elapsed = performance.now() - startedAt;
          console.debug('[React][diff-render] identical payload skipped', {
            elapsedMs: Number(elapsed.toFixed(2)),
            incomingHashMs: Number(incomingHashMs.toFixed(2)),
            previousHashMs: Number(previousHashMs.toFixed(2)),
            changedCount: 0,
            skipped: true
          });
        }
        return previousJson;
      }

      if (isNavigationFlowDSL(previousJson) || isNavigationFlowDSL(incomingDsl)) {
        if (isNavigationFlowDSL(previousJson) && isNavigationFlowDSL(incomingDsl)) {
          setFlowDiffResult(buildFlowSemanticDiff({ previousDsl: previousJson, nextDsl: incomingDsl }));
        }
        return incomingDsl;
      }

      const tMergeStart = isDevelopmentMode ? performance.now() : 0;
      const mergedDsl = mergeDslWithPrevious(previousJson, incomingDsl);
      const mergeMs = isDevelopmentMode ? performance.now() - tMergeStart : 0;

      const mergedComponents = mergedDsl.page?.components || [];
      const previousComponents = previousJson.page?.components || [];
      const changedCount = mergedComponents.reduce((count, component, index) =>
        count + (component === previousComponents[index] ? 0 : 1), 0);

      if (isDevelopmentMode) {
        const elapsed = performance.now() - startedAt;
        console.debug('[React][diff-render] component diff applied', {
          elapsedMs: Number(elapsed.toFixed(2)),
          incomingHashMs: Number(incomingHashMs.toFixed(2)),
          previousHashMs: Number(previousHashMs.toFixed(2)),
          mergeMs: Number(mergeMs.toFixed(2)),
          changedCount,
          skipped: false
        });
      }

      return mergedDsl;
    });
  }, []);

  const postReady = useCallback(() => {
    if (vscodeApi?.postMessage) {
      console.log('[React] posting webview-ready');
      vscodeApi.postMessage({ type: 'webview-ready' });
    }
  }, []);

  useWebviewMessages({
    postReady,
    applyDslUpdate,
    setError,
    setUpdateStatus,
    setLastCompletedAt,
    setShowUpdateIndicator,
    setShowJumpToDslHoverIndicator,
    onDiffUpdate: setDiffResult,
    onConflictUpdate: setConflictResult,
    onHighlightComponent: setHighlightedIndex,
    onOverlayDiffInit: setOverlayDiffState,
    onSetReturnPath: setReturnPath,
    onSourcePathUpdate: setExportSourcePath
  });

  const exportSourceMeta = summarizeExportSourcePath(exportSourcePath);

  const handleExport = () => {
    if (vscodeApi?.postMessage) {
      vscodeApi.postMessage({ type: 'export', ...(exportSourcePath ? { sourcePath: exportSourcePath } : {}) });
    }
  };

  const handleExportPreview = () => {
    if (vscodeApi?.postMessage) {
      vscodeApi.postMessage({ type: 'export-preview', ...(exportSourcePath ? { sourcePath: exportSourcePath } : {}) });
    }
  };

  const handleJumpToDsl = (dslPath: string, componentName: string, targetFilePath?: string) => {
    const runtimeApi = getVSCodeApi();
    if (!runtimeApi?.postMessage) {
      return;
    }
    runtimeApi.postMessage({
      type: 'jump-to-dsl',
      dslPath,
      componentName,
      targetFilePath
    });
  };

  const handleNavigateBack = () => {
    const runtimeApi = getVSCodeApi();
    if (!runtimeApi?.postMessage || !returnPath) {
      return;
    }
    runtimeApi.postMessage({ type: 'navigate-back', returnPath });
    setReturnPath(null);
  };

  // PreviewNavBar: 1ステップ前に戻る（E-NI-S5）
  const handlePreviewNavBack = () => {
    if (navHistory.length === 0) { return; }
    const prev = navHistory[navHistory.length - 1];
    setNavHistory(h => h.slice(0, -1));
    setPreviewCurrentScreenId(prev.screenId);
    // 前の画面 DSL を復元
    const screenDslMap = (window as unknown as Record<string, unknown>).__textui_screen_dsl_map__ as Record<string, TextUIDSL> | undefined;
    if (screenDslMap && screenDslMap[prev.screenId]) {
      setJson(screenDslMap[prev.screenId]);
    }
  };

  // PreviewNavBar: フローに戻る（E-NI-S5）
  const handleBackToFlow = () => {
    const runtimeApi = getVSCodeApi();
    if (runtimeApi?.postMessage) {
      runtimeApi.postMessage({ type: 'back-to-flow' });
    }
    setNavHistory([]);
  };

  // preview-navigate メッセージを受信して遷移先ページを解決する（E-NI-S4）
  useEffect(() => {
    const handlePreviewNavigate = (event: MessageEvent) => {
      if (!event.data || event.data.type !== 'preview-navigate') { return; }
      const trigger = event.data.trigger as string;
      if (!trigger) { return; }

      // extension host に転送する（E-NI-S14）
      getVSCodeApi()?.postMessage({ type: 'preview-navigate', trigger });

      setJson(currentJson => {
        if (!currentJson || isNavigationFlowDSL(currentJson)) { return currentJson; }
        const currentScreenId = currentJson.page?.id ?? null;
        setPreviewCurrentScreenId(currentScreenId);

        // ロード済みフロー DSL を window から取得（FlowPreviewPanel が設定する想定）
        const flowDslRaw = (window as unknown as Record<string, unknown>).__textui_flow_dsl__;
        if (!flowDslRaw || !isNavigationFlowDSL(flowDslRaw as TextUIDSL)) { return currentJson; }
        const flowDsl = flowDslRaw as NavigationFlowDSL;

        // from 一致優先で遷移先を解決
        const transitions = flowDsl.flow?.transitions ?? [];
        const matched = transitions.find(t => t.trigger === trigger && t.from === currentScreenId)
          ?? transitions.find(t => t.trigger === trigger);
        if (!matched) { return currentJson; }

        // 遷移先画面の DSL を window から取得（Extension が設定する想定）
        const screenDslMap = (window as unknown as Record<string, unknown>).__textui_screen_dsl_map__ as Record<string, TextUIDSL> | undefined;
        if (!screenDslMap) { return currentJson; }
        const nextDsl = screenDslMap[matched.to];
        if (!nextDsl) { return currentJson; }

        // history に現在の画面を push
        setNavHistory(prev => [...prev, {
          screenId: currentScreenId ?? '',
          pageTitle: currentJson.page?.title,
        }]);

        return nextDsl;
      });
    };

    window.addEventListener('message', handlePreviewNavigate);
    return () => window.removeEventListener('message', handlePreviewNavigate);
  }, []);

  const handleDismissJumpToDslOnboarding = () => {
    persistJumpToDslOnboardingDismissed(
      typeof window !== 'undefined' ? window.localStorage : undefined,
      dismissJumpToDslForever
    );
    setShowJumpToDslOnboarding(false);
  };

  if (overlayDiffState) {
    return <OverlayDiffViewer state={overlayDiffState} />;
  }

  if (!json && !error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>Loading preview…</div>
        <div style={{ fontSize: '0.85rem', opacity: 0.65 }}>Reading DSL · applying theme · validating schema</div>
      </div>
    );
  }
  if (!json) {
    return <ErrorPanel error={error!} />;
  }

  if (isNavigationFlowDSL(json)) {
    return (
      <div
        className={showJumpToDslHoverIndicator ? 'textui-preview-root' : 'textui-preview-root textui-preview-root-hide-jump-hover'}
        style={{ padding: 24, position: 'relative' }}
      >
        <div style={{ position: 'fixed', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', zIndex: 1000, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ThemeToggle />
          <CustomThemeSelector />
          <ExportButton
            onExport={handleExport}
            onExportPreview={handleExportPreview}
            sourceLabel={exportSourceMeta.label}
            sourceTitle={exportSourceMeta.title}
          />
        </div>
        {showUpdateIndicator ? (
          <UpdateIndicator
            status={updateStatus}
            lastCompletedAt={lastCompletedAt}
            showRelativeTimestamp={isDevelopmentMode}
          />
        ) : null}
        {showJumpToDslOnboarding ? (
          <div
            style={{
              marginBottom: '1rem',
              padding: '0.875rem 1rem',
              borderRadius: '0.75rem',
              border: '1px solid rgba(96, 165, 250, 0.45)',
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(30, 64, 175, 0.88))',
              color: '#eff6ff',
              boxShadow: '0 16px 32px rgba(15, 23, 42, 0.22)'
            }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Flow preview tips
            </div>
            <div style={{ fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.96 }}>
              画面ノードを <strong>Ctrl+Shift+Click</strong>（Mac: <strong>⌘+Shift+Click</strong>）すると対応する DSL ソースへジャンプできます。
            </div>
            <div style={{ fontSize: '0.8rem', lineHeight: 1.45, opacity: 0.82, marginTop: '0.35rem' }}>
              Ctrl+Shift+Click (Mac: ⌘+Shift+Click) a screen node to jump to its DSL source.
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                flexWrap: 'wrap',
                marginTop: '0.75rem'
              }}
            >
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <input
                  type="checkbox"
                  checked={dismissJumpToDslForever}
                  onChange={(event) => setDismissJumpToDslForever(event.target.checked)}
                />
                以後は表示しない / Don&apos;t show again
              </label>
              <button
                type="button"
                onClick={handleDismissJumpToDslOnboarding}
                style={{
                  border: '1px solid rgba(191, 219, 254, 0.45)',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#eff6ff',
                  borderRadius: '9999px',
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                OK
              </button>
            </div>
          </div>
        ) : null}
        <FlowPreviewPanel flowDsl={json} onJumpToDsl={handleJumpToDsl} diffResult={flowDiffResult ?? undefined} />
        {error ? (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'rgba(20, 5, 5, 0.96)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.5)',
          }}>
            <ErrorPanel error={error} />
          </div>
        ) : null}
      </div>
    );
  }

  if (!isTextUiDsl(json)) {
    return <ErrorPanel error="Unsupported preview payload." />;
  }

  const components: ComponentDef[] = json.page?.components || [];
  const componentKeys = createComponentKeys(
    components,
    prevComponentsKeysRef.current?.components ?? null,
    prevComponentsKeysRef.current?.keys ?? null
  );
  prevComponentsKeysRef.current = { components, keys: componentKeys };

  return (
    <div
      className={showJumpToDslHoverIndicator ? 'textui-preview-root' : 'textui-preview-root textui-preview-root-hide-jump-hover'}
      style={{ padding: 24, position: 'relative' }}
    >
      {/* PreviewNavBar: 画面遷移履歴がある場合のみ表示（E-NI-S5） */}
      <PreviewNavBar
        history={navHistory}
        onBack={handlePreviewNavBack}
        onBackToFlow={handleBackToFlow}
      />
      {showJumpToDslOnboarding ? (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.875rem 1rem',
            borderRadius: '0.75rem',
            border: '1px solid rgba(96, 165, 250, 0.45)',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(30, 64, 175, 0.88))',
            color: '#eff6ff',
            boxShadow: '0 16px 32px rgba(15, 23, 42, 0.22)'
          }}
        >
          <div style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.35rem' }}>
            Preview tips
          </div>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.5, opacity: 0.96 }}>
            コンポーネントを <strong>Ctrl+Shift+Click</strong> すると DSL ソースへジャンプできます。
          </div>
          <div style={{ fontSize: '0.8rem', lineHeight: 1.45, opacity: 0.82, marginTop: '0.35rem' }}>
            Ctrl+Shift+Click a component in the preview to jump back to its DSL source.
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginTop: '0.75rem'
            }}
          >
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={dismissJumpToDslForever}
                onChange={(event) => setDismissJumpToDslForever(event.target.checked)}
              />
              以後は表示しない / Don&apos;t show again
            </label>
            <button
              type="button"
              onClick={handleDismissJumpToDslOnboarding}
              style={{
                border: '1px solid rgba(191, 219, 254, 0.45)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#eff6ff',
                borderRadius: '9999px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}
      <div style={{ position: 'fixed', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', zIndex: 1000, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <ThemeToggle />
        <CustomThemeSelector />
        <ExportButton
          onExport={handleExport}
          onExportPreview={handleExportPreview}
          sourceLabel={exportSourceMeta.label}
          sourceTitle={exportSourceMeta.title}
        />
      </div>
      {returnPath ? (
        <button
          type="button"
          onClick={handleNavigateBack}
          style={{
            position: 'fixed',
            top: 8,
            left: 8,
            zIndex: 1000,
            padding: '4px 10px',
            background: 'var(--vscode-button-secondaryBackground, rgba(60,60,60,0.85))',
            color: 'var(--vscode-button-secondaryForeground, #ccc)',
            border: '1px solid var(--vscode-button-border, rgba(120,120,120,0.4))',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          ← Back to flow
        </button>
      ) : null}
      {showUpdateIndicator ? (
        <UpdateIndicator
          status={updateStatus}
          lastCompletedAt={lastCompletedAt}
          showRelativeTimestamp={isDevelopmentMode}
        />
      ) : null}
      {diffResult?.hasChanges ? (
        <span style={{ fontSize: '0.75rem', color: '#fbbf24', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(251,191,36,0.12)' }}>
          {diffResult.nodes.filter(n => n.changeType !== 'unchanged').length} changes
        </span>
      ) : null}
      {conflictResult?.hasConflicts ? (
        <span style={{ fontSize: '0.75rem', color: '#f87171', padding: '0.2rem 0.5rem', borderRadius: '0.375rem', background: 'rgba(248,113,113,0.12)' }}>
          &#9888; {conflictResult.entries.length} conflicts
        </span>
      ) : null}
      {components.map((comp, i) => (
        <div key={componentKeys[i] || i} style={highlightedIndex === i ? { outline: '2px solid #60a5fa' } : undefined}>
          {renderRegisteredComponent(comp, componentKeys[i] || i, {
            dslPath: `/page/components/${i}`,
            onJumpToDsl: handleJumpToDsl
          })}
        </div>
      ))}
      <div
        style={{
          position: 'sticky',
          bottom: 0,
          marginTop: '1rem',
          padding: '0.7rem 0.9rem',
          borderRadius: '0.75rem',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          background: 'rgba(15, 23, 42, 0.72)',
          backdropFilter: 'blur(10px)',
          color: '#dbeafe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ fontSize: '0.8rem', lineHeight: 1.45 }}>
          <strong style={{ fontWeight: 700 }}>Jump to DSL</strong>
          <span style={{ opacity: 0.9 }}>  Ctrl+Shift+Click</span>
        </div>
        <div style={{ fontSize: '0.76rem', opacity: 0.78, lineHeight: 1.4 }}>
          Preview component to source navigation stays available after the first-run tip.
        </div>
      </div>
      {error ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'rgba(20, 5, 5, 0.96)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.5)',
        }}>
          <ErrorPanel error={error} />
        </div>
      ) : null}
    </div>
  );
};

attachDevToolsListener(window.require);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
