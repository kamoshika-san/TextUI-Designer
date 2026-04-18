import type { ValidationIssue } from '../types';

interface TokenIndex {
  nodeMap: Map<string, unknown>;
  leafMap: Map<string, unknown>;
}

type ResolveResult =
  | { ok: true; value: unknown }
  | { ok: false; kind: 'undefined' | 'type' | 'cycle'; tokenPath: string; cycle?: string[] };

interface TokenUsage {
  token: string;
  path: string;
}

const TOKEN_REF_PATTERN = /^\{([A-Za-z0-9_.-]+)\}$/;

export function validateTokenReferences(
  tokens: Record<string, unknown>,
  tokenUsages: TokenUsage[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const tokenIndex = buildTokenIndex(tokens);
  issues.push(...validateTokenDefinitions(tokenIndex));
  issues.push(...validateTokenUsageReferences(tokenUsages, tokenIndex));
  return issues;
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

function validateTokenUsageReferences(tokenUsages: TokenUsage[], tokenIndex: TokenIndex): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

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

function normalizeTokenPath(tokenPath: string): string {
  const withoutPrefix = tokenPath.startsWith('tokens.') ? tokenPath.slice('tokens.'.length) : tokenPath;

  if (withoutPrefix === 'color' || withoutPrefix.startsWith('color.')) {
    return `colors${withoutPrefix.slice('color'.length)}`;
  }

  return withoutPrefix;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
