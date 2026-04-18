import type { TextUIDSL } from '../domain/dsl-types';
import { loadThemeTokensWithDefaultFallback, findNearestThemePath as findNearestThemePathInternal } from './theme-token-source';
import { collectComponentEntries } from './component-traversal';

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

interface TokenIndex {
  nodeMap: Map<string, unknown>;
  leafMap: Map<string, unknown>;
}

type ResolveResult =
  | { ok: true; value: unknown }
  | { ok: false; kind: 'undefined' | 'type' | 'cycle'; cycle?: string[] };

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
          message: `token '${entry.props.token}' could not be resolved because theme tokens were unavailable`
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
        message: 'token must be a string'
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
          message: `undefined token reference: ${tokenPath}`
        });
      } else if (result.kind === 'type') {
        issues.push({
          kind: 'type',
          path: issuePath,
          message: `token must resolve to a scalar value: ${tokenPath}`
        });
      } else {
        issues.push({
          kind: 'cycle',
          path: issuePath,
          message: `token reference cycle detected: ${(result.cycle ?? []).join(' -> ')}`
        });
      }
      delete entry.props.token;
      return;
    }

    if (!isScalarTokenValue(result.value)) {
      issues.push({
        kind: 'invalid-value',
        path: issuePath,
        message: `token value must be scalar: ${tokenPath}`
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
  throw new Error(`token resolution failed:\n${joined}`);
}

function isScalarTokenValue(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function loadThemeTokens(sourcePath: string): { tokens: Record<string, unknown> | null; issues: TokenResolutionIssue[] } {
  const loadResult = loadThemeTokensWithDefaultFallback(sourcePath);
  return {
    tokens: loadResult.tokens,
    issues: loadResult.issues.map(issue => ({
      kind: issue.kind,
      path: '/',
      message: issue.message
    }))
  };
}

export function findNearestThemePath(sourcePath: string): string | null {
  return findNearestThemePathInternal(sourcePath);
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
  const withoutPrefix = tokenPath.startsWith('tokens.') ? tokenPath.slice('tokens.'.length) : tokenPath;

  if (withoutPrefix === 'color' || withoutPrefix.startsWith('color.')) {
    return `colors${withoutPrefix.slice('color'.length)}`;
  }

  return withoutPrefix;
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
