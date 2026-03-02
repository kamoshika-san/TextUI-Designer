import * as fs from 'fs';
import * as path from 'path';
import Ajv from 'ajv';
import type { ValidationResult, ValidationIssue } from './types';

export function validateDsl(dsl: unknown): ValidationResult {
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

  issues.push(...validateSemanticRules(dsl));

  return {
    valid: issues.every(issue => issue.level !== 'error'),
    issues
  };
}

function validateSemanticRules(dsl: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!dsl || typeof dsl !== 'object') {
    return [{ level: 'error', message: 'DSLがオブジェクトではありません', path: '/' }];
  }

  const root = dsl as { page?: { components?: unknown[] } };
  const components = root.page?.components;
  if (!Array.isArray(components)) {
    return issues;
  }

  const seenIds = new Set<string>();
  components.forEach((component, index) => {
    if (!component || typeof component !== 'object') {
      issues.push({ level: 'error', message: 'コンポーネント定義が不正です', path: `/page/components/${index}` });
      return;
    }

    const [type] = Object.keys(component as Record<string, unknown>);
    if (!type) {
      issues.push({ level: 'error', message: 'コンポーネント型が未指定です', path: `/page/components/${index}` });
      return;
    }

    const props = (component as Record<string, unknown>)[type] as Record<string, unknown> | undefined;
    const id = typeof props?.id === 'string' ? props.id : undefined;

    if (id) {
      if (seenIds.has(id)) {
        issues.push({ level: 'error', message: `重複ID: ${id}`, path: `/page/components/${index}/${type}/id` });
      }
      seenIds.add(id);
    }
  });

  return issues;
}
