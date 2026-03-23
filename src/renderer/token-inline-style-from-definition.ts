import type { CSSProperties } from 'react';
import {
  getDeclaredTokenSlotsForComponent,
  getDefaultTokenSlotForComponent,
  getTokenStylePropertyKebab,
  tokenStyleKebabToReactCamel
} from '../components/definitions/token-style-property-map';
import { themeStyleResolver } from '../exporters/theme-style-resolver';

/**
 * WebView プレビュー用: `COMPONENT_DEFINITIONS.tokenStyleProperty` と同じ対応で React の style を返す。
 * `defaultTokenSlot` がある場合は exporter（`BaseComponentRenderer`）と同じ `var(--tui-slot-…, token)`（T-202 / T-203）。
 */
export function tokenToPreviewInlineStyle(
  componentName: string,
  token: string | undefined,
  tokenSlots?: string[]
): CSSProperties | undefined {
  if (!token) {
    return undefined;
  }
  const kebab = getTokenStylePropertyKebab(componentName);
  if (!kebab) {
    return undefined;
  }
  const declaredSlots = getDeclaredTokenSlotsForComponent(componentName);
  const shouldResolveBindings = (tokenSlots && tokenSlots.length > 0) || (declaredSlots && declaredSlots.length > 0);

  if (shouldResolveBindings) {
    const style: CSSProperties = {};
    for (const binding of themeStyleResolver.resolveComponentTokenSlotBindings(componentName, tokenSlots)) {
      (style as Record<string, string>)[tokenStyleKebabToReactCamel(binding.property)] =
        themeStyleResolver.formatResolvedTokenSlotValue(binding.slotId, token);
    }
    return Object.keys(style).length > 0 ? style : undefined;
  }

  const slot = getDefaultTokenSlotForComponent(componentName);
  const value = slot ? themeStyleResolver.formatResolvedTokenSlotValue(slot, token) : token;
  return { [tokenStyleKebabToReactCamel(kebab)]: value } as CSSProperties;
}
