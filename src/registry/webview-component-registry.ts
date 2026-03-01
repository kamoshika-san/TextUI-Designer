import type { ReactNode } from 'react';

export type WebViewComponentRenderer = (props: Record<string, unknown>, key: number) => ReactNode;

const webViewComponentMap = new Map<string, WebViewComponentRenderer>();

/**
 * WebViewコンポーネントレンダラーを登録
 */
export function registerWebViewComponent(name: string, renderer: WebViewComponentRenderer): void {
  webViewComponentMap.set(name, renderer);
}

/**
 * 登録済みレンダラーを取得
 */
export function getWebViewComponentRenderer(
  name: string
): WebViewComponentRenderer | undefined {
  return webViewComponentMap.get(name);
}

/**
 * 登録済みコンポーネント名一覧を取得
 */
export function getRegisteredWebViewComponents(): string[] {
  return Array.from(webViewComponentMap.keys());
}

/**
 * テスト用途: レジストリを初期化
 */
export function clearWebViewComponentRegistry(): void {
  webViewComponentMap.clear();
}
