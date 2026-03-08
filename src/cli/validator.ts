import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import Ajv from 'ajv';
import type { ValidationResult, ValidationIssue } from './types';

interface ComponentEntry {
  type: string;
  props: Record<string, unknown>;
  path: string;
}

interface TokenUsage {
  token: string;
  path: string;
}

interface TokenIndex {
  nodeMap: Map<string, unknown>;
  leafMap: Map<string, unknown>;
}

type ResolveResult =
  | { ok: true; value: unknown }
  | { ok: false; kind: 'undefined' | 'type' | 'cycle'; tokenPath: string; cycle?: string[] };

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

export function validateDsl(
  dsl: unknown,
  options: { sourcePath?: string; skipTokenValidation?: boolean } = {}
): ValidationResult {
  const schemaPath = path.resolve(__dirname, '../../schemas/schema.json');
  const schemaRaw = fs.readFileSync(schemaPath, 'utf8');
  const schema = JSON.parse(schemaRaw);

  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  const valid = validate(dsl);

  const issues: ValidationIssue[] = [];
  if (!valid && validate.errors) {
    validate.errors.forEach(error => {
      issues.push({
        level: 'error',
        message: error.message || 'schema validation error',
        path: error.instancePath || '/'
      });
    });
  }

  issues.push(...validateSemanticRules(dsl, options.sourcePath, options.skipTokenValidation ?? false));

  return {
    valid: issues.every(issue => issue.level !== 'error'),
    issues
  };
}

function validateSemanticRules(dsl: unknown, sourcePath?: string, skipTokenValidation: boolean = false): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!dsl || typeof dsl !== 'object') {
    return [{ level: 'error', message: 'DSLがオブジェクトではありません', path: '/' }];
  }

  const components = collectComponentEntries(dsl);
  const seenIds = new Set<string>();
  const tokenUsages: TokenUsage[] = [];

  components.forEach(component => {
    const id = component.props.id;
    if (typeof id === 'string') {
      if (seenIds.has(id)) {
        issues.push({
          level: 'error',
          message: `重複ID: ${id}`,
          path: `${component.path}/id`
        });
      }
      seenIds.add(id);
    }

    if (!Object.prototype.hasOwnProperty.call(component.props, 'token')) {
      return;
    }

    const tokenValue = component.props.token;
    if (tokenValue === undefined || tokenValue === null) {
      return;
    }

    if (typeof tokenValue !== 'string') {
      issues.push({
        level: 'error',
        message: 'token は文字列で指定してください',
        path: `${component.path}/token`
      });
      return;
    }

    tokenUsages.push({ token: tokenValue, path: `${component.path}/token` });
  });

  if (tokenUsages.length === 0) {
    return issues;
  }

  if (skipTokenValidation) {
    return issues;
  }

  if (!sourcePath) {
    issues.push({
      level: 'error',
      message: 'token検証にはDSLファイルパスが必要です',
      path: '/'
    });
    return issues;
  }

  const themeLoad = loadThemeTokens(sourcePath);
  issues.push(...themeLoad.issues);
  if (!themeLoad.tokens) {
    return issues;
  }

  const tokenIndex = buildTokenIndex(themeLoad.tokens);
  issues.push(...validateTokenDefinitions(tokenIndex));

  tokenUsages.forEach(usage => {
    const result = resolveTokenValue(usage.token, tokenIndex, []);
    if (result.ok) {
      return;
    }

    if (result.kind === 'undefined') {
      issues.push({
        level: 'error',
        message: `未定義のtoken参照: ${usage.token}`,
        path: usage.path
      });
      return;
    }

    if (result.kind === 'type') {
      issues.push({
        level: 'error',
        message: `token型不整合: ${usage.token} はオブジェクトを指しており、スカラー値を期待します`,
        path: usage.path
      });
      return;
    }

    issues.push({
      level: 'error',
      message: `token循環参照を検出しました: ${(result.cycle ?? []).join(' -> ')}`,
      path: usage.path
    });
  });

  return issues;
}

function collectComponentEntries(dsl: unknown): ComponentEntry[] {
  const entries: ComponentEntry[] = [];
  const root = dsl as { page?: { components?: unknown[] }; components?: unknown[] };
  collectFromComponentArray(root.page?.components, '/page/components', entries);
  collectFromComponentArray(root.components, '/components', entries);
  return entries;
}

function collectFromComponentArray(
  values: unknown,
  basePath: string,
  entries: ComponentEntry[]
): void {
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
        const itemComponents = (item as Record<string, unknown>).components;
        collectFromComponentArray(
          itemComponents,
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
        const itemComponents = (item as Record<string, unknown>).components;
        collectFromComponentArray(
          itemComponents,
          `${componentPath}/items/${itemIndex}/components`,
          entries
        );
      });
    }
  });
}

function loadThemeTokens(sourcePath: string): { tokens: Record<string, unknown> | null; issues: ValidationIssue[] } {
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
    return { ok: false, kind: 'undefined', tokenPath: normalized };
  }

  if (stack.includes(normalized)) {
    return { ok: false, kind: 'cycle', tokenPath: normalized, cycle: [...stack, normalized] };
  }

  if (!tokenIndex.leafMap.has(normalized)) {
    return { ok: false, kind: 'type', tokenPath: normalized };
  }

  const value = tokenIndex.leafMap.get(normalized);
  const reference = parseTokenReference(value);
  if (!reference) {
    return { ok: true, value };
  }

  return resolveTokenValue(reference, tokenIndex, [...stack, normalized]);
}

function validateTokenDefinitions(tokenIndex: TokenIndex): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const seenIssueKeys = new Set<string>();

  tokenIndex.leafMap.forEach((_value, tokenPath) => {
    const result = resolveTokenValue(tokenPath, tokenIndex, []);
    if (result.ok) {
      return;
    }

    let message: string;
    if (result.kind === 'undefined') {
      message = `token定義が未定義の参照を含みます: ${tokenPath}`;
    } else if (result.kind === 'type') {
      message = `token定義がオブジェクト参照を含みます: ${tokenPath}`;
    } else {
      message = `token定義で循環参照を検出しました: ${(result.cycle ?? []).join(' -> ')}`;
    }

    const issueKey = `${result.kind}:${message}`;
    if (seenIssueKeys.has(issueKey)) {
      return;
    }
    seenIssueKeys.add(issueKey);

    issues.push({
      level: 'error',
      message,
      path: `/theme/tokens/${tokenPath.replace(/\./g, '/')}`
    });
  });

  return issues;
}
