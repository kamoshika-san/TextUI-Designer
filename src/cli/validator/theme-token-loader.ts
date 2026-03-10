import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { ValidationIssue } from '../types';

export function loadThemeTokens(sourcePath: string): { tokens: Record<string, unknown> | null; issues: ValidationIssue[] } {
  const themePath = findNearestThemePath(sourcePath);
  if (!themePath) {
    return {
      tokens: null,
      issues: [{
        level: 'error',
        message: 'tokenを使用していますが textui-theme.yml / textui-theme.yaml が見つかりません',
        path: '/'
      }]
    };
  }

  try {
    const theme = loadThemeDefinition(themePath, []);
    const tokens = extractTokens(theme);
    if (!tokens) {
      return {
        tokens: null,
        issues: [{
          level: 'error',
          message: `テーマに tokens 定義がありません: ${themePath}`,
          path: '/'
        }]
      };
    }

    return { tokens, issues: [] };
  } catch (error) {
    return {
      tokens: null,
      issues: [{
        level: 'error',
        message: `テーマ読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        path: '/'
      }]
    };
  }
}

function findNearestThemePath(sourcePath: string): string | null {
  const candidates = ['textui-theme.yml', 'textui-theme.yaml'];
  let current = path.dirname(path.resolve(sourcePath));

  while (true) {
    for (const fileName of candidates) {
      const candidate = path.join(current, fileName);
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function loadThemeDefinition(themePath: string, chain: string[]): unknown {
  const absolutePath = path.resolve(themePath);
  if (chain.includes(absolutePath)) {
    throw new Error(`テーマ継承で循環参照を検出しました: ${[...chain, absolutePath].join(' -> ')}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = YAML.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    return parsed;
  }

  const root = parsed as { theme?: { extends?: unknown } };
  const extendsPath = root.theme?.extends;
  if (typeof extendsPath !== 'string' || !extendsPath.trim() || extendsPath.startsWith('npm:')) {
    return parsed;
  }

  const parentPath = path.resolve(path.dirname(absolutePath), extendsPath);
  const parent = loadThemeDefinition(parentPath, [...chain, absolutePath]);
  return deepMerge(parent, parsed);
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override ?? base;
  }

  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override ?? base;
  }

  const result: Record<string, unknown> = { ...base };
  Object.entries(override).forEach(([key, value]) => {
    result[key] = deepMerge((base as Record<string, unknown>)[key], value);
  });
  return result;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractTokens(theme: unknown): Record<string, unknown> | null {
  if (!isPlainObject(theme)) {
    return null;
  }

  const themeRoot = theme.theme;
  if (!isPlainObject(themeRoot)) {
    return null;
  }

  const tokens = themeRoot.tokens;
  if (!isPlainObject(tokens)) {
    return null;
  }

  return tokens;
}
