import { DEFAULT_THEME_COMPONENTS, DEFAULT_THEME_TOKENS } from './default-theme';

export class ThemeUtils {
  /** WebView のデフォルトテーマと同じ CSS 変数ブロックを返す。テーマ未指定時の Export/キャプチャで使用する。 */
  static getDefaultThemeCssVariables(): string {
    return ThemeUtils.buildCssVariables(DEFAULT_THEME_TOKENS, DEFAULT_THEME_COMPONENTS);
  }

  static deepMerge(base: unknown, override: unknown): unknown {
    if (Array.isArray(base) || Array.isArray(override)) {
      return override ?? base;
    }

    if (!ThemeUtils.isPlainObject(base) || !ThemeUtils.isPlainObject(override)) {
      return override ?? base;
    }

    const result: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      const baseValue = (base as Record<string, unknown>)[key];
      result[key] = ThemeUtils.deepMerge(baseValue, value);
    }
    return result;
  }

  static normalizeTokenVocabulary(tokens: unknown): Record<string, unknown> {
    if (!ThemeUtils.isPlainObject(tokens)) {
      return {};
    }

    const normalized = ThemeUtils.deepMerge({}, tokens) as Record<string, unknown>;
    const legacyColor = ThemeUtils.isPlainObject(normalized.color) ? normalized.color : undefined;
    const canonicalColors = ThemeUtils.isPlainObject(normalized.colors) ? normalized.colors : undefined;

    if (legacyColor || canonicalColors) {
      normalized.colors = ThemeUtils.deepMerge(legacyColor ?? {}, canonicalColors ?? {}) as Record<string, unknown>;
      delete normalized.color;
    }

    return normalized;
  }

  static flattenTokens(obj: unknown, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    if (!obj || typeof obj !== 'object') {
      return result;
    }

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const newKey = prefix ? `${prefix}-${key}` : key;
      if (ThemeUtils.isTokenLeaf(value)) {
        result[newKey] = value.value;
      } else if (value && typeof value === 'object') {
        Object.assign(result, ThemeUtils.flattenTokens(value, newKey));
      } else {
        result[newKey] = String(value);
      }
    }

    return result;
  }

  static generateComponentVariables(components: unknown): Record<string, string> {
    const result: Record<string, string> = {};

    for (const [componentName, variants] of Object.entries(components as Record<string, unknown>)) {
      if (!variants || typeof variants !== 'object') {
        continue;
      }

      for (const [variantName, styles] of Object.entries(variants as Record<string, unknown>)) {
        if (!styles || typeof styles !== 'object') {
          continue;
        }

        for (const [propertyName, value] of Object.entries(styles as Record<string, unknown>)) {
          const varName = `component-${componentName}-${variantName}-${propertyName}`;
          result[varName] = String(value);
        }
      }
    }

    return result;
  }

  static buildThemeVariableMap(tokens: unknown, components: unknown): Record<string, string> {
    const canonicalTokens = ThemeUtils.normalizeTokenVocabulary(tokens);
    const tokenVars = ThemeUtils.flattenTokens(canonicalTokens);
    const legacyColorAliases = ThemeUtils.buildLegacyColorAliases(tokenVars);

    return {
      ...tokenVars,
      ...legacyColorAliases,
      ...ThemeUtils.generateComponentVariables(components)
    };
  }

  static resolveThemeVariableInputs(
    tokens: unknown,
    components: unknown
  ): { tokens: Record<string, unknown>; components: Record<string, unknown> } {
    const canonicalTokens = ThemeUtils.normalizeTokenVocabulary(tokens);
    const mergedTokens = ThemeUtils.deepMerge(DEFAULT_THEME_TOKENS, canonicalTokens) as Record<string, unknown>;
    const mergedComponents = ThemeUtils.deepMerge(DEFAULT_THEME_COMPONENTS, components) as Record<string, unknown>;

    return {
      tokens: mergedTokens,
      components: mergedComponents
    };
  }

  static buildResolvedThemeVariableMap(tokens: unknown, components: unknown): Record<string, string> {
    const resolved = ThemeUtils.resolveThemeVariableInputs(tokens, components);
    return ThemeUtils.buildThemeVariableMap(resolved.tokens, resolved.components);
  }

  static buildCssVariables(tokens: unknown, components: unknown): string {
    const allVars = ThemeUtils.buildResolvedThemeVariableMap(tokens, components);
    const lines = Object.entries(allVars).map(([k, v]) => `  --${k}: ${v} !important;`);

    return `html body :root {\n${lines.join('\n')}\n}\nhtml :root {\n${lines.join('\n')}\n}\n:root {\n${lines.join('\n')}\n}\nbody {\n${lines.join('\n')}\n}\n#root {\n${lines.join('\n')}\n}`;
  }

  private static isTokenLeaf(value: unknown): value is { value: string } {
    if (!value || typeof value !== 'object' || !('value' in value)) {
      return false;
    }
    const leaf = value as { value: unknown };
    return typeof leaf.value === 'string';
  }

  private static isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  private static buildLegacyColorAliases(tokenVars: Record<string, string>): Record<string, string> {
    const aliases: Record<string, string> = {};

    Object.entries(tokenVars).forEach(([key, value]) => {
      if (!key.startsWith('colors-')) {
        return;
      }
      aliases[`color-${key.slice('colors-'.length)}`] = value;
    });

    return aliases;
  }
}
