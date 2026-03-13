export class ThemeUtils {
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

  static buildCssVariables(tokens: unknown, components: unknown): string {
    const allVars = {
      ...ThemeUtils.flattenTokens(tokens),
      ...ThemeUtils.generateComponentVariables(components)
    };
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
}
