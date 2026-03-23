import type {
  ThemeStyleDeclaration,
  ThemeStyleRuleBlock,
  ThemeStyleValue
} from '../components/definitions/theme-style-rules';
import {
  formatResolvedTokenSlotValue,
  resolveComponentTokenSlotBindings,
  type ResolvedTokenSlotBinding
} from '../components/definitions/token-slot-style-shared';

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
    return resolveComponentTokenSlotBindings(componentName, tokenSlots);
  }

  formatResolvedTokenSlotValue(slotId: string, fallback: string): string {
    return formatResolvedTokenSlotValue(slotId, fallback);
  }
}

export const themeStyleResolver = new ThemeStyleResolver();
