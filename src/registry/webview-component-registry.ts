import type { Key, ReactNode } from 'react';
import type { BuiltInComponentName } from '../components/definitions/built-in-components';

export type WebViewComponentRenderer = (props: Record<string, unknown>, key: Key) => ReactNode;

const webViewComponentMap = new Map<string, WebViewComponentRenderer>();

/**
 * WebViewコンポーネントレンダラーを登録（組み込み名は `BuiltInComponentName` でキー不一致を検知しやすくする）
 */
export function registerWebViewComponent(name: BuiltInComponentName, renderer: WebViewComponentRenderer): void;
export function registerWebViewComponent(name: string, renderer: WebViewComponentRenderer): void;
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
