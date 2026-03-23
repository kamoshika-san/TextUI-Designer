import type {
  ThemeStyleDeclaration,
  ThemeStyleRuleBlock,
  ThemeStyleValue
} from '../components/definitions/theme-style-rules';
import {
  getDeclaredTokenSlotsForComponent,
  getCompatibleTokenSlotsForComponent,
  getTokenStylePropertyKebab,
  slotIdToCssProperty,
  slotIdToTuiCssVarName
} from '../components/definitions/token-style-property-map';

export type ResolvedTokenSlotBinding = {
  slotId: string;
  property: string;
};

/**
 * theme style 解決の単一入口。
 * - rules は「どの selector に何を当てるか」の宣言だけを持つ
 * - resolver は「var key / fallback / raw 値」を CSS 文字列へ解決する
 */
export class ThemeStyleResolver {
  resolveValue(value: ThemeStyleValue): string {
    if (value.kind === 'raw') {
      return value.value;
    }
    return `var(--${value.varKey}, ${value.fallback})`;
  }

  resolveDeclaration(decl: ThemeStyleDeclaration): string {
    return `${decl.property}: ${this.resolveValue(decl.value)} !important;`;
  }

  resolveRuleBlock(rule: ThemeStyleRuleBlock): string {
    const selectorLine = `    ${rule.selectors.join(',\n    ')}`;
    const declarationLines = rule.declarations
      .map(decl => `      ${this.resolveDeclaration(decl)}`)
      .join('\n');
    return `${selectorLine} {\n${declarationLines}\n    }`;
  }

  resolveComponentTokenSlotBindings(componentName: string, tokenSlots?: string[]): ResolvedTokenSlotBinding[] {
    const preferredSlots =
      tokenSlots && tokenSlots.length > 0
        ? tokenSlots
        : getDeclaredTokenSlotsForComponent(componentName) ?? getCompatibleTokenSlotsForComponent(componentName);
    const fallbackProperty = getTokenStylePropertyKebab(componentName);
    if (!fallbackProperty) {
      return [];
    }

    const seen = new Set<string>();
    return preferredSlots
      .filter(slotId => {
        if (seen.has(slotId)) {
          return false;
        }
        seen.add(slotId);
        return true;
      })
      .map(slotId => ({
        slotId,
        property: slotIdToCssProperty(slotId) ?? fallbackProperty
      }));
  }

  formatResolvedTokenSlotValue(slotId: string, fallback: string): string {
    return `var(${slotIdToTuiCssVarName(slotId)}, ${fallback})`;
  }
}

export const themeStyleResolver = new ThemeStyleResolver();
