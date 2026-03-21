import type {
  ThemeStyleDeclaration,
  ThemeStyleRuleBlock,
  ThemeStyleValue
} from '../components/definitions/theme-style-rules';

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
}

export const themeStyleResolver = new ThemeStyleResolver();
