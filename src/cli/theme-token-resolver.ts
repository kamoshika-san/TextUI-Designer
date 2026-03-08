import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { TextUIDSL } from '../renderer/types';

export type TokenErrorMode = 'error' | 'warn' | 'ignore';

export interface TokenResolutionIssue {
  kind: 'undefined' | 'type' | 'cycle' | 'missing-theme' | 'invalid-token' | 'invalid-value' | 'theme-load';
  path: string;
  message: string;
}

export interface ResolveDslTokensResult {
  dsl: TextUIDSL;
  issues: TokenResolutionIssue[];
}

interface ComponentEntry {
  type: string;
  props: Record<string, unknown>;
  path: string;
}

interface TokenIndex {
  nodeMap: Map<string, unknown>;
  leafMap: Map<string, unknown>;
}

type ResolveResult =
  | { ok: true; value: unknown }
  | { ok: false; kind: 'undefined' | 'type' | 'cycle'; cycle?: string[] };

const KNOWN_COMPONENTS = new Set([
  'Text',
  'Input',
  'Button',
  'Form',
  'Checkbox',
  'Radio',
  'Select',
  'Divider',
  'Container',
  'Alert',
  'Accordion',
  'Tabs',
  'Table'
]);

const TOKEN_REF_PATTERN = /^\{([A-Za-z0-9_.-]+)\}$/;

export function resolveDslTokens(params: {
  dsl: TextUIDSL;
  sourcePath: string;
  onError: TokenErrorMode;
}): ResolveDslTokensResult {
  const resolvedDsl = JSON.parse(JSON.stringify(params.dsl)) as TextUIDSL;
  const entries = collectComponentEntries(resolvedDsl);
  const tokenEntries = entries.filter(entry => Object.prototype.hasOwnProperty.call(entry.props, 'token'));

  if (tokenEntries.length === 0) {
    return { dsl: resolvedDsl, issues: [] };
  }

  const themeLoad = loadThemeTokens(params.sourcePath);
  const issues: TokenResolutionIssue[] = [...themeLoad.issues];

  if (!themeLoad.tokens) {
    tokenEntries.forEach(entry => {
      if (typeof entry.props.token === 'string' && entry.props.token.trim()) {
        issues.push({
          kind: 'missing-theme',
          path: `${entry.path}/token`,
          message: `token '${entry.props.token}' を解決できません（テーマ未検出）`
        });
      }
      delete entry.props.token;
    });
    return finalizeResolution(resolvedDsl, issues, params.onError);
  }

  const tokenIndex = buildTokenIndex(themeLoad.tokens);

  tokenEntries.forEach(entry => {
    const tokenPath = entry.props.token;
    const issuePath = `${entry.path}/token`;
    if (tokenPath === undefined || tokenPath === null || tokenPath === '') {
      delete entry.props.token;
      return;
    }

    if (typeof tokenPath !== 'string') {
      issues.push({
        kind: 'invalid-token',
        path: issuePath,
        message: 'token は文字列で指定してください'
      });
      delete entry.props.token;
      return;
    }

    const result = resolveTokenValue(tokenPath, tokenIndex, []);
    if (!result.ok) {
      if (result.kind === 'undefined') {
        issues.push({
          kind: 'undefined',
          path: issuePath,
          message: `未定義のtoken参照: ${tokenPath}`
        });
      } else if (result.kind === 'type') {
        issues.push({
          kind: 'type',
          path: issuePath,
          message: `token型不整合: ${tokenPath} はオブジェクトを指しており、スカラー値を期待します`
        });
      } else {
        issues.push({
          kind: 'cycle',
          path: issuePath,
          message: `token循環参照を検出しました: ${(result.cycle ?? []).join(' -> ')}`
        });
      }
      delete entry.props.token;
      return;
    }

    if (!isScalarTokenValue(result.value)) {
      issues.push({
        kind: 'invalid-value',
        path: issuePath,
        message: `token値の型が不正です: ${tokenPath}`
      });
      delete entry.props.token;
      return;
    }

    entry.props.token = String(result.value);
  });

  return finalizeResolution(resolvedDsl, issues, params.onError);
}

function finalizeResolution(
  dsl: TextUIDSL,
  issues: TokenResolutionIssue[],
  onError: TokenErrorMode
): ResolveDslTokensResult {
  if (issues.length === 0) {
    return { dsl, issues: [] };
  }

  if (onError === 'ignore') {
    return { dsl, issues: [] };
  }

  if (onError === 'warn') {
    return { dsl, issues };
  }

  const joined = issues.map(issue => `${issue.path}: ${issue.message}`).join('\n');
  throw new Error(`token解決に失敗しました:\n${joined}`);
}

function isScalarTokenValue(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function collectComponentEntries(dsl: unknown): ComponentEntry[] {
  const entries: ComponentEntry[] = [];
  const root = dsl as { page?: { components?: unknown[] }; components?: unknown[] };
  collectFromComponentArray(root.page?.components, '/page/components', entries);
  collectFromComponentArray(root.components, '/components', entries);
  return entries;
}

function collectFromComponentArray(values: unknown, basePath: string, entries: ComponentEntry[]): void {
  if (!Array.isArray(values)) {
    return;
  }

  values.forEach((value, index) => {
    const currentPath = `${basePath}/${index}`;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return;
    }

    const componentDef = value as Record<string, unknown>;
    const [type] = Object.keys(componentDef);
    if (!type || !KNOWN_COMPONENTS.has(type)) {
      return;
    }

    const props = componentDef[type];
    if (!props || typeof props !== 'object' || Array.isArray(props)) {
      return;
    }

    const componentPath = `${currentPath}/${type}`;
    const propsRecord = props as Record<string, unknown>;
    entries.push({ type, props: propsRecord, path: componentPath });

    if (type === 'Container') {
      collectFromComponentArray(propsRecord.components, `${componentPath}/components`, entries);
      return;
    }

    if (type === 'Form') {
      collectFromComponentArray(propsRecord.fields, `${componentPath}/fields`, entries);
      collectFromComponentArray(propsRecord.actions, `${componentPath}/actions`, entries);
      return;
    }

    if (type === 'Tabs') {
      const items = propsRecord.items;
      if (!Array.isArray(items)) {
        return;
      }
      items.forEach((item, itemIndex) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return;
        }
        collectFromComponentArray(
          (item as Record<string, unknown>).components,
          `${componentPath}/items/${itemIndex}/components`,
          entries
        );
      });
      return;
    }

    if (type === 'Accordion') {
      const items = propsRecord.items;
      if (!Array.isArray(items)) {
        return;
      }
      items.forEach((item, itemIndex) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return;
        }
        collectFromComponentArray(
          (item as Record<string, unknown>).components,
          `${componentPath}/items/${itemIndex}/components`,
          entries
        );
      });
    }
  });
}

function loadThemeTokens(sourcePath: string): { tokens: Record<string, unknown> | null; issues: TokenResolutionIssue[] } {
  const themePath = findNearestThemePath(sourcePath);
  if (!themePath) {
    return {
      tokens: null,
      issues: [{
        kind: 'missing-theme',
        path: '/',
        message: 'textui-theme.yml / textui-theme.yaml が見つかりません'
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
          kind: 'theme-load',
          path: '/',
          message: `テーマに tokens 定義がありません: ${themePath}`
        }]
      };
    }
    return { tokens, issues: [] };
  } catch (error) {
    return {
      tokens: null,
      issues: [{
        kind: 'theme-load',
        path: '/',
        message: `テーマ読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`
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
  if (!isPlainObject(theme) || !isPlainObject(theme.theme)) {
    return null;
  }
  const tokens = (theme.theme as Record<string, unknown>).tokens;
  if (!isPlainObject(tokens)) {
    return null;
  }
  return tokens;
}

function buildTokenIndex(tokens: Record<string, unknown>): TokenIndex {
  const nodeMap = new Map<string, unknown>();
  const leafMap = new Map<string, unknown>();

  const walk = (value: unknown, prefix: string): void => {
    if (!isPlainObject(value)) {
      nodeMap.set(prefix, value);
      leafMap.set(prefix, value);
      return;
    }

    if (Object.prototype.hasOwnProperty.call(value, 'value')) {
      const tokenValue = (value as Record<string, unknown>).value;
      nodeMap.set(prefix, tokenValue);
      leafMap.set(prefix, tokenValue);
      return;
    }

    nodeMap.set(prefix, value);
    Object.entries(value).forEach(([key, child]) => {
      const nextPath = prefix ? `${prefix}.${key}` : key;
      walk(child, nextPath);
    });
  };

  Object.entries(tokens).forEach(([key, value]) => {
    walk(value, key);
  });

  return { nodeMap, leafMap };
}

function normalizeTokenPath(tokenPath: string): string {
  return tokenPath.startsWith('tokens.') ? tokenPath.slice('tokens.'.length) : tokenPath;
}

function parseTokenReference(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const matched = TOKEN_REF_PATTERN.exec(value.trim());
  if (!matched) {
    return null;
  }
  return normalizeTokenPath(matched[1]);
}

function resolveTokenValue(tokenPath: string, tokenIndex: TokenIndex, stack: string[]): ResolveResult {
  const normalized = normalizeTokenPath(tokenPath);

  if (!tokenIndex.nodeMap.has(normalized)) {
    return { ok: false, kind: 'undefined' };
  }
  if (stack.includes(normalized)) {
    return { ok: false, kind: 'cycle', cycle: [...stack, normalized] };
  }
  if (!tokenIndex.leafMap.has(normalized)) {
    return { ok: false, kind: 'type' };
  }

  const value = tokenIndex.leafMap.get(normalized);
  const reference = parseTokenReference(value);
  if (!reference) {
    return { ok: true, value };
  }

  return resolveTokenValue(reference, tokenIndex, [...stack, normalized]);
}
