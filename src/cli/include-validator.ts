import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { ValidationIssue } from './types';

interface IncludeDirective {
  $include: {
    template: string;
  };
}

export function validateIncludeReferences(entryDsl: unknown, entryFile: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsedCache = new Map<string, unknown>();

  const walk = (node: unknown, currentFile: string, includeStack: string[]): void => {
    if (Array.isArray(node)) {
      node.forEach(item => walk(item, currentFile, includeStack));
      return;
    }

    if (!isRecord(node)) {
      return;
    }

    if (isIncludeDirective(node)) {
      const includePath = path.resolve(path.dirname(currentFile), node.$include.template);
      if (includeStack.includes(includePath)) {
        issues.push({
          level: 'error',
          path: '/',
          message: `循環参照を検出しました: ${[...includeStack, includePath].join(' -> ')}`
        });
        return;
      }

      try {
        let includeDsl = parsedCache.get(includePath);
        if (includeDsl === undefined) {
          const raw = fs.readFileSync(includePath, 'utf8');
          includeDsl = YAML.parse(raw);
          parsedCache.set(includePath, includeDsl);
        }

        walk(includeDsl, includePath, [...includeStack, includePath]);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        issues.push({
          level: 'error',
          path: '/',
          message: `テンプレート読み込みに失敗しました: ${node.$include.template} (${message})`
        });
      }
    }

    Object.values(node).forEach(value => walk(value, currentFile, includeStack));
  };

  walk(entryDsl, entryFile, [entryFile]);
  return issues;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isIncludeDirective(value: unknown): value is IncludeDirective {
  return (
    isRecord(value)
    && isRecord(value.$include)
    && typeof value.$include.template === 'string'
  );
}

