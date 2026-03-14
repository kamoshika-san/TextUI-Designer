/**
 * 静的 HTML エクスポート用: WebView と同じ React ツリーを renderToStaticMarkup で文字列化する。
 * webview.tsx は import しない（createRoot / document 依存のため）。
 */
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ComponentDef } from '../renderer/types';
import { createComponentKeys } from '../renderer/preview-diff';
import { renderRegisteredComponent, registerBuiltInComponents } from '../renderer/component-map';
import { getWebViewComponentRenderer } from '../registry/webview-component-registry';

/**
 * DSL の page.components を受け取り、WebView と同じルート（padding のみ、ThemeToggle/ExportButton なし）
 * で React ツリーを組み立て、renderToStaticMarkup で HTML 文字列を返す。
 */
export function renderPageComponentsToStaticHtml(components: ComponentDef[]): string {
  // 他テストや拡張処理でレジストリがクリアされる経路に備えて自己修復する。
  if (!getWebViewComponentRenderer('Text')) {
    registerBuiltInComponents();
  }

  const componentKeys = createComponentKeys(components);
  const root = (
    <div style={{ padding: 24 }}>
      {components.map((comp, i) =>
        renderRegisteredComponent(comp, componentKeys[i] ?? i, {
          dslPath: `/page/components/${i}`
        })
      )}
    </div>
  );
  return renderToStaticMarkup(root);
}
