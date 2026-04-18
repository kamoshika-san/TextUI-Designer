import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import { DEFAULT_THEME_TOKENS } from '../theme/default-theme';
import { ThemeUtils } from '../theme/theme-utils';

export interface ThemeTokenSourceIssue {
  kind: 'theme-load';
  message: string;
}

export interface ThemeTokenSourceResult {
  tokens: Record<string, unknown> | null;
  source: 'theme-file' | 'default-theme';
  themePath: string | null;
  issues: ThemeTokenSourceIssue[];
}

export function loadThemeTokensWithDefaultFallback(sourcePath: string): ThemeTokenSourceResult {
  const themePath = findNearestThemePath(sourcePath);
  if (!themePath) {
    return {
      tokens: ThemeUtils.normalizeTokenVocabulary(DEFAULT_THEME_TOKENS),
      source: 'default-theme',
      themePath: null,
      issues: []
    };
  }

  try {
    const theme = loadThemeDefinition(themePath, []);
    const tokens = extractTokens(theme);
    if (!tokens) {
      return {
        tokens: null,
        source: 'theme-file',
        themePath,
        issues: [{
          kind: 'theme-load',
          message: `theme file does not contain tokens: ${themePath}`
        }]
      };
    }

    return {
      tokens,
      source: 'theme-file',
      themePath,
      issues: []
    };
  } catch (error) {
    return {
      tokens: null,
      source: 'theme-file',
      themePath,
      issues: [{
        kind: 'theme-load',
        message: `failed to load theme file: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
}

export function findNearestThemePath(sourcePath: string): string | null {
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
    throw new Error(`theme extends cycle detected: ${[...chain, absolutePath].join(' -> ')}`);
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
  return ThemeUtils.deepMerge(parent, parsed);
}

function extractTokens(theme: unknown): Record<string, unknown> | null {
  if (!isPlainObject(theme) || !isPlainObject(theme.theme)) {
    return null;
  }

  const tokens = (theme.theme as Record<string, unknown>).tokens;
  if (!isPlainObject(tokens)) {
    return null;
  }

  return ThemeUtils.normalizeTokenVocabulary(tokens);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
