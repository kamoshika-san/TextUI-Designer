import type { RenderContext } from '../renderer/render-context';

/**
 * HTML 静的エクスポート primary 経路用: プレビュー専用（jump-to-DSL）の文脈を渡さない（T-194）。
 * `undefined` のとき、component-map は共有カーネルのみ描画しプレビュー枠を付けない。
 */
export function getStaticHtmlRenderContext(): RenderContext | undefined {
  return undefined;
}
