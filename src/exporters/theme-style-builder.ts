import { THEME_STYLE_RULE_BLOCKS } from '../components/definitions/theme-style-rules';
import { themeStyleResolver } from './theme-style-resolver';

// 呼び出しのたびに組み立てず、モジュールロード時に一度だけ固定生成する
const RULES_CSS = THEME_STYLE_RULE_BLOCKS
  .map(rule => themeStyleResolver.resolveRuleBlock(rule))
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
