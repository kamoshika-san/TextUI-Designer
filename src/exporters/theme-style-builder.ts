import { THEME_STYLE_RULE_BLOCKS, type ThemeStyleDeclaration } from '../components/definitions/theme-style-rules';

function buildDeclarationCss(decl: ThemeStyleDeclaration): string {
  const { property, value } = decl;

  if (value.kind === 'raw') {
    return `      ${property}: ${value.value} !important;`;
  }

  return `      ${property}: var(--${value.varKey}, ${value.fallback}) !important;`;
}

function buildRuleBlockCss(selectors: string[], declarations: ThemeStyleDeclaration[]): string {
  const selectorLine = `    ${selectors.join(',\n    ')}`;
  const declLines = declarations.map(buildDeclarationCss).join('\n');
  return `${selectorLine} {\n${declLines}\n    }`;
}

// 呼び出しのたびに組み立てず、モジュールロード時に一度だけ固定生成する
const RULES_CSS = THEME_STYLE_RULE_BLOCKS
  .map(rule => buildRuleBlockCss(rule.selectors, rule.declarations))
  .join('\n\n');

export function buildThemeStyleBlock(allVars: Record<string, string>): string {
  if (Object.keys(allVars).length === 0) {
    return '';
  }

  const varLines = Object.entries(allVars)
    .map(([key, value]) => `  --${key}: ${value} !important;`)
    .join('\n');

  return `
    /* textui-theme.yml から反映されたテーマ */
    :root {
${varLines}
    }

${RULES_CSS}`;
}
