import type { CSSProperties } from 'react';
import {
  getDefaultTokenSlotForComponent,
  getTokenStylePropertyKebab,
  slotIdToTuiCssVarName,
  tokenStyleKebabToReactCamel
} from '../components/definitions/token-style-property-map';

/**
 * WebView プレビュー用: `COMPONENT_DEFINITIONS.tokenStyleProperty` と同じ対応で React の style を返す。
 * `defaultTokenSlot` がある場合は exporter と同様に `var(--tui-slot-…, token)`（T-20260322-202）。
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
  const slot = getDefaultTokenSlotForComponent(componentName);
  const value = slot ? `var(${slotIdToTuiCssVarName(slot)}, ${token})` : token;
  return { [tokenStyleKebabToReactCamel(kebab)]: value } as CSSProperties;
}
