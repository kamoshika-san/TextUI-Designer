import Ajv, { ErrorObject } from 'ajv';
import type { SchemaDefinition, SchemaValidationError, SchemaValidationResult } from '../../types';

export function validateDataAgainstSchema(data: unknown, schema: SchemaDefinition): SchemaValidationResult {
  try {
    const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
    const validate = ajv.compile(schema);
    const valid = validate(data);

    const mappedErrors: SchemaValidationError[] | undefined = valid
      ? undefined
      : (validate.errors ?? []).map((error: ErrorObject): SchemaValidationError => {
          const errorWithData = error as ErrorObject & { data?: unknown };
          return {
            keyword: error.keyword,
            dataPath: error.instancePath || '',
            schemaPath: error.schemaPath || '',
            params: (error.params as Record<string, unknown>) || {},
            message: error.message || 'スキーマエラー',
            data: errorWithData.data
          };
        });

    return { valid, errors: mappedErrors };
  } catch (error: unknown) {
    return {
      valid: false,
      errors: [{
        keyword: 'validation_error',
        dataPath: '',
        schemaPath: '',
        params: {},
        message: `スキーマ検証中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        data
      }]
    };
  }
}
