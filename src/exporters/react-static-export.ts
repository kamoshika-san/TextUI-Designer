/**
 * 静的 HTML エクスポート用: WebView と同じ React ツリーを renderToStaticMarkup で文字列化する。
 * webview.tsx は import しない（createRoot / document 依存のため）。
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentDef } from '../domain/dsl-types';
import { createComponentKeys } from '../renderer/preview-diff';
import { renderRegisteredComponent } from '../renderer/component-map';
import { getStaticHtmlRenderContext } from './static-html-render-adapter';

/**
 * DSL の page.components を受け取り、WebView と同じルート（padding のみ、ThemeToggle/ExportButton なし）
 * で React ツリーを組み立て、renderToStaticMarkup で HTML 文字列を返す。
 * プレビュー固有の jump-to-DSL 文脈はアダプタ経由で渡さない（T-194）。
 */
export function renderPageComponentsToStaticHtml(components: ComponentDef[]): string {
  const componentKeys = createComponentKeys(components);
  const staticCtx = getStaticHtmlRenderContext();
  const children = components.map((comp, i) =>
    renderRegisteredComponent(comp, componentKeys[i] ?? i, staticCtx)
  );

  return renderToStaticMarkup(
    React.createElement('div', { style: { padding: 24 } }, ...children)
  );
}
