import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { DEFAULT_THEME_COMPONENTS, DEFAULT_THEME_TOKENS } from '../theme/default-theme';
import { ThemeUtils } from '../theme/theme-utils';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function deepMerge(base: unknown, override: unknown): unknown {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override ?? base;
  }
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override ?? base;
  }
  const result: Record<string, unknown> = { ...base };
  Object.entries(override).forEach(([key, value]) => {
    result[key] = deepMerge(base[key], value);
  });
  return result;
}

function loadThemeDefinition(themePath: string, chain: string[]): unknown {
  const absolutePath = path.resolve(themePath);
  if (chain.includes(absolutePath)) {
    throw new Error(`テーマ継承で循環参照を検出しました: ${[...chain, absolutePath].join(' -> ')}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = YAML.parse(raw);
  if (!isPlainObject(parsed)) {
    return parsed;
  }

  const themeRoot = parsed.theme;
  if (!isPlainObject(themeRoot)) {
    return parsed;
  }

  const extendsPath = typeof themeRoot.extends === 'string' ? themeRoot.extends.trim() : '';
  if (!extendsPath || extendsPath.startsWith('npm:')) {
    return parsed;
  }

  const parentPath = path.resolve(path.dirname(absolutePath), extendsPath);
  const parent = loadThemeDefinition(parentPath, [...chain, absolutePath]);
  return deepMerge(parent, parsed);
}

function extractThemeSection(themeDefinition: unknown, key: 'tokens' | 'components'): Record<string, unknown> {
  if (!isPlainObject(themeDefinition) || !isPlainObject(themeDefinition.theme)) {
    return {};
  }
  const section = (themeDefinition.theme as Record<string, unknown>)[key];
  return isPlainObject(section) ? section : {};
}

export function buildThemeVariables(themePath: string): Record<string, string> {
  const theme = loadThemeDefinition(themePath, []);
  const tokens = ThemeUtils.normalizeTokenVocabulary(extractThemeSection(theme, 'tokens'));
  const components = extractThemeSection(theme, 'components');
  /* WebView の ThemeManager と同様にデフォルトとマージしてから flatten する */
  const mergedTokens = deepMerge(DEFAULT_THEME_TOKENS, tokens) as Record<string, unknown>;
  const mergedComponents = deepMerge(DEFAULT_THEME_COMPONENTS, components) as Record<string, unknown>;
  return ThemeUtils.buildThemeVariableMap(mergedTokens, mergedComponents);
}
