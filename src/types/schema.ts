export interface SchemaDefinition {
  $schema?: string;
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  definitions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors?: SchemaValidationError[];
}

export interface SchemaValidationError {
  keyword: string;
  dataPath: string;
  schemaPath: string;
  params: Record<string, unknown>;
  message: string;
  data?: unknown;
}

export function isSchemaDefinition(obj: unknown): obj is SchemaDefinition {
  return typeof obj === 'object' && obj !== null && 'type' in obj;
}
