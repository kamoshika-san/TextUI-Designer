import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeToggle } from './components/ThemeToggle';
import { CustomThemeSelector } from './components/CustomThemeSelector';
import { renderRegisteredComponent, registerBuiltInComponents } from './component-map';
import type { TextUIDSL, ComponentDef } from './types';
import { getVSCodeApi } from './vscode-api';
import { createComponentKeys, hashString, mergeDslWithPrevious } from './preview-diff';
import type { ErrorInfo } from './error-guidance';
import { ErrorPanel } from './components/ErrorPanel';
import { ExportButton } from './components/ExportButton';
import { useWebviewMessages } from './use-webview-messages';
import { attachDevToolsListener } from './devtools-listener';
import { getSharedLayoutStyles } from '../shared/layout-styles';

const vscodeApi = getVSCodeApi();

const isDevelopmentMode = Boolean(
  (typeof globalThis !== 'undefined' && (globalThis as { __TUI_DEV_MODE__?: boolean }).__TUI_DEV_MODE__) ||
  window.location.search.includes('textui-dev=true')
);

const App: React.FC = () => {
  const [json, setJson] = useState<TextUIDSL | null>(null);
  const [error, setError] = useState<ErrorInfo | string | null>(null);
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
    setError
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
    <div style={{ padding: 24, position: 'relative' }}>
      <ThemeToggle />
      <CustomThemeSelector />
      <ExportButton onExport={handleExport} />
      {components.map((comp, i) => renderRegisteredComponent(comp, componentKeys[i] || i, {
        dslPath: `/page/components/${i}`,
        onJumpToDsl: handleJumpToDsl
      }))}
    </div>
  );
};

attachDevToolsListener(window.require);

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
