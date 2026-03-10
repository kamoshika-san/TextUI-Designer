import type { TextUIDSL } from '../../renderer/types';

export interface OpenApiDocument {
  openapi?: string;
  paths?: Record<string, PathItemObject>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
}

export interface PathItemObject {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  patch?: OperationObject;
  delete?: OperationObject;
}

export interface OperationObject {
  operationId?: string;
  summary?: string;
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: OpenApiSchema }>;
  };
  parameters?: ParameterObject[];
}

export interface ParameterObject {
  name: string;
  in?: string;
  required?: boolean;
  schema?: OpenApiSchema;
}

export interface OpenApiSchema {
  $ref?: string;
  type?: string;
  format?: string;
  enum?: unknown[];
  items?: OpenApiSchema;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
  allOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
}

export interface ResolvedOperation {
  method: string;
  path: string;
  operationId: string;
  operation: OperationObject;
}

export interface FieldDescriptor {
  kind: 'Input' | 'Select' | 'Checkbox' | 'DatePicker';
  name: string;
  label: string;
  required: boolean;
  inputType?: 'text' | 'email' | 'password' | 'number' | 'multiline';
  options?: Array<{ label: string; value: string }>;
  multiple?: boolean;
}

export interface OpenApiImportResult {
  dsl: TextUIDSL;
  yaml: string;
  operationId: string;
  sourceOperation: string;
  fields: number;
}
