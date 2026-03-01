/**
 * コンポーネントレジストリ
 * コンポーネント名の検出・プロパティ抽出・ハンドラー管理を一元化し、
 * エクスポーター・WebView双方のif-else連鎖を排除する
 */
import {
  BUILT_IN_COMPONENTS,
  isBuiltInComponentName,
  type BuiltInComponentName
} from './component-manifest';

export { BUILT_IN_COMPONENTS, type BuiltInComponentName };

/**
 * オブジェクトからコンポーネント名（最初のキー）を取得
 * ComponentDef / FormField の両方に使用可能
 */
export function getComponentName(comp: Record<string, unknown>): string | undefined {
  const keys = Object.keys(comp);
  return keys.length > 0 ? keys[0] : undefined;
}

/**
 * オブジェクトからコンポーネントのプロパティを取得
 */
export function getComponentProps<T = unknown>(comp: Record<string, unknown>): T | undefined {
  const name = getComponentName(comp);
  return name ? (comp[name] as T) : undefined;
}

/**
 * 組み込みコンポーネントかどうかを判定
 */
export function isBuiltInComponent(name: string): name is BuiltInComponentName {
  return isBuiltInComponentName(name);
}
