import type { CSSProperties } from 'react';
import { getTokenStylePropertyKebab, tokenStyleKebabToReactCamel } from '../components/definitions/token-style-property-map';

/**
 * WebView プレビュー用: `COMPONENT_DEFINITIONS.tokenStyleProperty` と同じ対応で React の style を返す。
 * エクスポータは `BaseComponentRenderer` が同一マップ（kebab）を参照する。
 */
export function tokenToPreviewInlineStyle(
  componentName: string,
  token: string | undefined
): CSSProperties | undefined {
  if (!token) {
    return undefined;
  }
  const kebab = getTokenStylePropertyKebab(componentName);
  if (!kebab) {
    return undefined;
  }
  return { [tokenStyleKebabToReactCamel(kebab)]: token } as CSSProperties;
}
