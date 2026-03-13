import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { ValidationIssue } from '../cli/types';
import type { TextUIDSL } from '../renderer/types';
import type { CoreDiagnostic } from './textui-core-engine';

export function parseDsl(input: unknown): TextUIDSL {
  const parsed = typeof input === 'string' ? parseText(input) : (input as Record<string, unknown>);

  if (!parsed || typeof parsed !== 'object' || !('page' in parsed)) {
    throw new Error('DSLにはpageルートが必要です');
  }

  return parsed as unknown as TextUIDSL;
}

function parseText(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('DSL文字列が空です');
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed) as Record<string, unknown>;
  }

  return YAML.parse(trimmed) as Record<string, unknown>;
}

export function mapDiagnostic(issue: ValidationIssue): CoreDiagnostic {
  return {
    ...issue,
    severity: issue.level === 'error' ? 'error' : 'warning',
    hint: mapHint(issue.message)
  };
}

export function mapHint(message: string): string {
  if (message.includes('must have required property')) {
    return '必須プロパティを追加してください。';
  }
  if (message.includes('must be')) {
    return '型・enum制約に合わせて値を修正してください。';
  }
  if (message.includes('重複ID')) {
    return 'idを一意に変更してください。';
  }
  if (message.includes('token')) {
    return 'token名とtheme定義の整合を確認してください。';
  }
  return 'schema.jsonとDSL構造を見比べて修正してください。';
}

export function resolveSchemaPath(schema: 'main' | 'template' | 'theme'): string {
  if (schema === 'template') {
    return path.resolve(__dirname, '../../schemas/template-schema.json');
  }
  if (schema === 'theme') {
    return path.resolve(__dirname, '../../schemas/theme-schema.json');
  }
  return path.resolve(__dirname, '../../schemas/schema.json');
}

export function previewSchemaValue(schema: 'main' | 'template' | 'theme', jsonPointer?: string): unknown {
  const schemaPath = resolveSchemaPath(schema);
  const raw = fs.readFileSync(schemaPath, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return jsonPointer ? resolveJsonPointer(parsed, jsonPointer) : parsed;
}

export function resolveJsonPointer(target: unknown, pointer: string): unknown {
  if (!pointer || pointer === '/') {
    return target;
  }
  if (!pointer.startsWith('/')) {
    throw new Error(`jsonPointerは "/" で始めてください: ${pointer}`);
  }

  const parts = pointer.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = target;

  for (const part of parts) {
    if (Array.isArray(current)) {
      const index = Number(part);
      if (Number.isNaN(index)) {
        throw new Error(`配列インデックスが不正です: ${part}`);
      }
      current = current[index];
      continue;
    }
    if (!current || typeof current !== 'object') {
      throw new Error(`jsonPointerが解決できません: ${pointer}`);
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function toPageId(title: string): string {
  const normalized = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'generated-page';
}
