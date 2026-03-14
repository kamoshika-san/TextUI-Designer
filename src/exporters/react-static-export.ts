/**
 * 静的 HTML エクスポート用: WebView と同じ React ツリーを renderToStaticMarkup で文字列化する。
 * webview.tsx は import しない（createRoot / document 依存のため）。
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentDef } from '../renderer/types';
import { createComponentKeys } from '../renderer/preview-diff';
import { renderRegisteredComponent } from '../renderer/component-map';

/**
 * DSL の page.components を受け取り、WebView と同じルート（padding のみ、ThemeToggle/ExportButton なし）
 * で React ツリーを組み立て、renderToStaticMarkup で HTML 文字列を返す。
 */
export function renderPageComponentsToStaticHtml(components: ComponentDef[]): string {
  const componentKeys = createComponentKeys(components);
  const children = components.map((comp, i) =>
    renderRegisteredComponent(comp, componentKeys[i] ?? i, {
      dslPath: `/page/components/${i}`
    })
  );

  return renderToStaticMarkup(
    React.createElement('div', { style: { padding: 24 } }, ...children)
  );
}
