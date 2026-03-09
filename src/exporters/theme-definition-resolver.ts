import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';

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

function isTokenLeaf(value: unknown): value is { value: string } {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.prototype.hasOwnProperty.call(value, 'value')
    && typeof (value as { value: unknown }).value === 'string'
  );
}

function flattenTokens(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  Object.entries(obj).forEach(([key, value]) => {
    const nextKey = prefix ? `${prefix}-${key}` : key;
    if (isTokenLeaf(value)) {
      result[nextKey] = value.value;
      return;
    }
    if (isPlainObject(value)) {
      Object.assign(result, flattenTokens(value, nextKey));
      return;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[nextKey] = String(value);
    }
  });
  return result;
}

function flattenComponentVars(components: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  Object.entries(components).forEach(([componentName, variants]) => {
    if (!isPlainObject(variants)) {
      return;
    }
    Object.entries(variants).forEach(([variantName, styles]) => {
      if (!isPlainObject(styles)) {
        return;
      }
      Object.entries(styles).forEach(([propertyName, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          result[`component-${componentName}-${variantName}-${propertyName}`] = String(value);
        }
      });
    });
  });
  return result;
}

export function buildThemeVariables(themePath: string): Record<string, string> {
  const theme = loadThemeDefinition(themePath, []);
  const tokens = extractThemeSection(theme, 'tokens');
  const components = extractThemeSection(theme, 'components');
  return {
    ...flattenTokens(tokens),
    ...flattenComponentVars(components)
  };
}
