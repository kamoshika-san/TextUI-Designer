import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { ValidationIssue } from '../cli/types';
import type { NavigationFlowDSL, TextUIDSL } from '../domain/dsl-types';
import type { CoreDiagnostic } from './textui-core-engine';

export function parseDsl(input: unknown, kind: 'ui' | 'navigation' = 'ui'): TextUIDSL | NavigationFlowDSL {
  const parsed = typeof input === 'string' ? parseText(input) : (input as Record<string, unknown>);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('DSL must be an object.');
  }

  if (kind === 'navigation') {
    if (!('flow' in parsed)) {
      throw new Error('Navigation flow DSL must contain a flow root.');
    }

    return parsed as unknown as NavigationFlowDSL;
  }

  if (!('page' in parsed)) {
    throw new Error('UI DSL must contain a page root.');
  }

  return parsed as unknown as TextUIDSL;
}

function parseText(raw: string): Record<string, unknown> {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error('DSL text is empty.');
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
    return 'Add the missing required property.';
  }
  if (message.includes('must be')) {
    return 'Use a value that matches the allowed enum or schema type.';
  }
  if (message.includes('Duplicate component id')) {
    return 'Use a unique id for each component.';
  }
  if (message.includes('token')) {
    return 'Check the token name and the theme referenced by this DSL.';
  }
  if (message.includes('flow')) {
    return 'Review the navigation flow entry, transitions, and referenced page files.';
  }

  return 'Check the schema and DSL structure for this document.';
}

export function resolveSchemaPath(schema: 'main' | 'template' | 'theme' | 'navigation'): string {
  if (schema === 'template') {
    return path.resolve(__dirname, '../../schemas/template-schema.json');
  }
  if (schema === 'theme') {
    return path.resolve(__dirname, '../../schemas/theme-schema.json');
  }
  if (schema === 'navigation') {
    return path.resolve(__dirname, '../../schemas/navigation-schema.json');
  }

  return path.resolve(__dirname, '../../schemas/schema.json');
}

export function previewSchemaValue(schema: 'main' | 'template' | 'theme' | 'navigation', jsonPointer?: string): unknown {
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
    throw new Error(`jsonPointer must start with "/": ${pointer}`);
  }

  const parts = pointer.slice(1).split('/').map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  let current: unknown = target;

  for (const part of parts) {
    if (Array.isArray(current)) {
      const index = Number(part);
      if (Number.isNaN(index)) {
        throw new Error(`Array index is invalid: ${part}`);
      }
      current = current[index];
      continue;
    }
    if (!current || typeof current !== 'object') {
      throw new Error(`jsonPointer could not be resolved: ${pointer}`);
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

export function toPageId(title: string): string {
  const normalized = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').replace(/-+$/, '');
  return normalized || 'generated-page';
}
