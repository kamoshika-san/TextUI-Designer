import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeToggle } from './components/ThemeToggle';
import { CustomThemeSelector } from './components/CustomThemeSelector';
import { renderRegisteredComponent, registerBuiltInComponents } from './component-map';
import type { TextUIDSL, ComponentDef } from '../domain/dsl-types';
import { getVSCodeApi } from './vscode-api';
import { createComponentKeys, hashString, mergeDslWithPrevious } from './preview-diff';
import type { ErrorInfo } from './error-guidance';
import { ErrorPanel } from './components/ErrorPanel';
import { ExportButton } from './components/ExportButton';
import { UpdateIndicator } from './components/UpdateIndicator';
import { useWebviewMessages } from './use-webview-messages';
import { attachDevToolsListener } from './devtools-listener';
import { getSharedLayoutStyles } from '../shared/layout-styles';
import {
  persistJumpToDslOnboardingDismissed,
  shouldShowJumpToDslOnboarding
} from './jump-to-dsl-onboarding';

const vscodeApi = getVSCodeApi();

const isDevelopmentMode = Boolean(
  (typeof globalThis !== 'undefined' && (globalThis as { __TUI_DEV_MODE__?: boolean }).__TUI_DEV_MODE__) ||
  window.location.search.includes('textui-dev=true')
);

const App: React.FC = () => {
  const [json, setJson] = useState<TextUIDSL | null>(null);
  const [error, setError] = useState<ErrorInfo | string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showJumpToDslHoverIndicator, setShowJumpToDslHoverIndicator] = useState(true);
  const [showJumpToDslOnboarding, setShowJumpToDslOnboarding] = useState(() =>
    shouldShowJumpToDslOnboarding(typeof window !== 'undefined' ? window.localStorage : undefined)
  );
  const [dismissJumpToDslForever, setDismissJumpToDslForever] = useState(false);
  const prevComponentsKeysRef = useRef<{ components: ComponentDef[]; keys: string[] } | null>(null);

  useEffect(() => {
    registerBuiltInComponents();
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
    `;
    document.head.appendChild(styleEl);
  }, []);

  const applyDslUpdate = useCallback((incomingDsl: TextUIDSL) => {
    const startedAt = performance.now();
    // 計測: 受信DSLのhash計算時間（T-20260317-006）
    const incomingHash = hashString(JSON.stringify(incomingDsl));
    const incomingHashMs = isDevelopmentMode ? performance.now() - startedAt : 0;

    setJson(previousJson => {
      if (!previousJson) {
        if (isDevelopmentMode) {
          const elapsed = performance.now() - startedAt;
          console.debug('[React][diff-render] 初回描画を適用しました', {
            elapsedMs: Number(elapsed.toFixed(2)),
            incomingHashMs: Number(incomingHashMs.toFixed(2)),
            changedCount: incomingDsl.page?.components?.length || 0,
            skipped: false
          });
        }
        return incomingDsl;
      }

      // 計測: 前回JSONのhash計算時間（T-20260317-006）
      const tPrevStart = isDevelopmentMode ? performance.now() : 0;
      const previousHash = hashString(JSON.stringify(previousJson));
      const previousHashMs = isDevelopmentMode ? performance.now() - tPrevStart : 0;

      if (previousHash === incomingHash) {
        if (isDevelopmentMode) {
          const elapsed = performance.now() - startedAt;
          console.debug('[React][diff-render] 変更がないため再描画をスキップしました', {
            elapsedMs: Number(elapsed.toFixed(2)),
            incomingHashMs: Number(incomingHashMs.toFixed(2)),
            previousHashMs: Number(previousHashMs.toFixed(2)),
            changedCount: 0,
            skipped: true
          });
        }
        return previousJson;
      }

      // 計測: mergeDslWithPrevious の所要時間（T-20260317-006）
      const tMergeStart = isDevelopmentMode ? performance.now() : 0;
      const mergedDsl = mergeDslWithPrevious(previousJson, incomingDsl);
      const mergeMs = isDevelopmentMode ? performance.now() - tMergeStart : 0;

      const mergedComponents = mergedDsl.page?.components || [];
      const previousComponents = previousJson.page?.components || [];
      const changedCount = mergedComponents.reduce((count, component, index) =>
        count + (component === previousComponents[index] ? 0 : 1), 0);

      if (isDevelopmentMode) {
        const elapsed = performance.now() - startedAt;
        console.debug('[React][diff-render] 差分描画を適用しました', {
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
      console.log('[React] WebView準備完了メッセージを送信');
      vscodeApi.postMessage({ type: 'webview-ready' });
    }
  }, []);

  useWebviewMessages({
    postReady,
    applyDslUpdate,
    setError,
    setIsUpdating,
    setShowJumpToDslHoverIndicator
  });

  const handleExport = () => {
    if (vscodeApi?.postMessage) {
      console.log('[React] エクスポートボタンがクリックされました');
      vscodeApi.postMessage({ type: 'export' });
    }
  };

  const handleJumpToDsl = (dslPath: string, componentName: string) => {
    const runtimeApi = getVSCodeApi();
    if (!runtimeApi?.postMessage) {
      return;
    }
    runtimeApi.postMessage({
      type: 'jump-to-dsl',
      dslPath,
      componentName
    });
  };

  const handleDismissJumpToDslOnboarding = () => {
    persistJumpToDslOnboardingDismissed(
      typeof window !== 'undefined' ? window.localStorage : undefined,
      dismissJumpToDslForever
    );
    setShowJumpToDslOnboarding(false);
  };

  if (error) {
    return <ErrorPanel error={error} />;
  }
  if (!json) {
    return (
      <div style={{ padding: 24 }}>
        <div>Loading...</div>
      </div>
    );
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
              今後表示しない / Don&apos;t show again
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
      <ThemeToggle />
      <CustomThemeSelector />
      <ExportButton onExport={handleExport} />
      <UpdateIndicator isUpdating={isUpdating} />
      {components.map((comp, i) => renderRegisteredComponent(comp, componentKeys[i] || i, {
        dslPath: `/page/components/${i}`,
        onJumpToDsl: handleJumpToDsl
      }))}
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
          <span style={{ opacity: 0.9 }}>  Ctrl+Shift+Click / Ctrl+Shift+クリック</span>
        </div>
        <div style={{ fontSize: '0.76rem', opacity: 0.78, lineHeight: 1.4 }}>
          Preview component to source navigation stays available after the first-run tip.
        </div>
      </div>
    </div>
  );
};

attachDevToolsListener(window.require);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
