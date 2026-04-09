import * as fs from 'fs';
import * as path from 'path';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import type { ValidationIssue } from '../types';

let cachedDslValidator: ValidateFunction | null = null;
let cachedNavigationValidator: ValidateFunction | null = null;

export function validateSchema(dsl: unknown, schemaKind: 'main' | 'navigation' = 'main'): ValidationIssue[] {
  const validate = getDslValidator(schemaKind);
  const valid = validate(dsl);

  if (valid || !validate.errors) {
    return [];
  }

  return validate.errors.map((error: ErrorObject) => ({
    level: 'error',
    message: error.message || 'schema validation error',
    path: error.instancePath || '/'
  }));
}

function getDslValidator(schemaKind: 'main' | 'navigation' = 'main'): ValidateFunction {
  if (schemaKind === 'navigation') {
    if (cachedNavigationValidator) {
      return cachedNavigationValidator;
    }

    const navigationSchemaPath = path.resolve(__dirname, '../../../schemas/navigation-schema.json');
    const navigationSchemaRaw = fs.readFileSync(navigationSchemaPath, 'utf8');
    const navigationSchema = JSON.parse(navigationSchemaRaw);
    const navigationAjv = new Ajv({ allErrors: true, strict: false });

    cachedNavigationValidator = navigationAjv.compile(navigationSchema);
    return cachedNavigationValidator;
  }

  if (cachedDslValidator) {
    return cachedDslValidator;
  }

  const schemaPath = path.resolve(__dirname, '../../../schemas/schema.json');
  const schemaRaw = fs.readFileSync(schemaPath, 'utf8');
  const schema = JSON.parse(schemaRaw);
  const ajv = new Ajv({ allErrors: true, strict: false });

  cachedDslValidator = ajv.compile(schema);
  return cachedDslValidator;
}
