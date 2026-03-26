/**
 * WebView コンポーネントマップ
 * コンポーネント名 → Reactレンダラーのマッピングを一元管理し、
 * webview.tsx のif-else連鎖を排除する
 *
 * preview 実装本体は {@link createBuiltInPreviewRenderers}（descriptor の previewRendererKey と対応）。
 */
import React from 'react';
import type { ComponentDef } from '../domain/dsl-types';
import { componentDescriptorRegistry } from '../registry/component-descriptor-registry';
import {
  registerWebViewComponent as registerRenderer,
  type WebViewComponentRenderer
} from '../registry/webview-component-registry';
import type { RenderContext } from './render-context';
import { composeRegisteredComponent } from './registered-component-kernel';
import { createBuiltInPreviewRenderers } from './preview-built-in-renderers';

/**
 * ComponentDef をレンダリング（Map ベースのディスパッチ）。webview / 静的 HTML から利用。
 * WebView は DSL コンポーネントキーの大小文字揺れを吸収しない（exact match のみ T-20260317-006）。
 * 共有カーネル + プレビュー専用 jump 枠は composeRegisteredComponent（T-193）。
 */
export function renderRegisteredComponent(
  comp: ComponentDef,
  key: React.Key,
  context?: RenderContext
): React.ReactNode {
  return composeRegisteredComponent(comp, key, context);
}

const builtInRenderers = createBuiltInPreviewRenderers({
  renderRegisteredComponent
});

function registerBuiltInComponentsImpl(): void {
  for (const def of componentDescriptorRegistry.list()) {
    registerRenderer(def.name, builtInRenderers[def.previewRendererKey]);
  }
}

registerBuiltInComponentsImpl();

/**
 * テスト等でレジストリがクリアされた後に組み込みコンポーネントを再登録する。
 */
export function registerBuiltInComponents(): void {
  registerBuiltInComponentsImpl();
}

/**
 * カスタムコンポーネントを登録するための公開API
 */
export function registerWebViewComponent(name: string, renderer: WebViewComponentRenderer): void {
  registerRenderer(name, renderer);
}
