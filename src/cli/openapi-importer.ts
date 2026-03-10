import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { TextUIDSL } from '../renderer/types';

interface OpenApiDocument {
  openapi?: string;
  paths?: Record<string, PathItemObject>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
}

interface PathItemObject {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  patch?: OperationObject;
  delete?: OperationObject;
}

interface OperationObject {
  operationId?: string;
  summary?: string;
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: OpenApiSchema }>;
  };
  parameters?: ParameterObject[];
}

interface ParameterObject {
  name: string;
  in?: string;
  required?: boolean;
  schema?: OpenApiSchema;
}

interface OpenApiSchema {
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

interface ResolvedOperation {
  method: string;
  path: string;
  operationId: string;
  operation: OperationObject;
}

interface FieldDescriptor {
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

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

function sortObjectKeys<T>(value: Record<string, T>): Array<[string, T]> {
  return Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
}

function loadOpenApiFile(inputPath: string): OpenApiDocument {
  const absolute = path.resolve(inputPath);
  if (!fs.existsSync(absolute)) {
    throw new Error(`OpenAPI file not found: ${absolute}`);
  }
  const raw = fs.readFileSync(absolute, 'utf8');
  try {
    if (absolute.endsWith('.json')) {
      return JSON.parse(raw) as OpenApiDocument;
    }
    return YAML.parse(raw) as OpenApiDocument;
  } catch (error) {
    throw new Error(`failed to parse OpenAPI document: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function sanitizeId(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'generated-page';
}

function toLabel(name: string): string {
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  if (!spaced) {
    return 'field';
  }
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function getNodeByRef(document: OpenApiDocument, ref: string): unknown {
  if (!ref.startsWith('#/')) {
    throw new Error(`only local $ref is supported: ${ref}`);
  }
  const parts = ref
    .slice(2)
    .split('/')
    .map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
  let node: unknown = document;
  for (const part of parts) {
    if (!node || typeof node !== 'object' || !(part in (node as Record<string, unknown>))) {
      throw new Error(`$ref target not found: ${ref}`);
    }
    node = (node as Record<string, unknown>)[part];
  }
  return node;
}

function resolveSchema(schema: OpenApiSchema | undefined, document: OpenApiDocument, trace: string[] = []): OpenApiSchema {
  if (!schema) {
    return {};
  }

  if (schema.$ref) {
    const ref = schema.$ref;
    if (trace.includes(ref)) {
      throw new Error(`schema $ref cycle detected: ${[...trace, ref].join(' -> ')}`);
    }
    const target = getNodeByRef(document, ref);
    if (!target || typeof target !== 'object') {
      throw new Error(`invalid $ref target: ${ref}`);
    }
    return resolveSchema(target as OpenApiSchema, document, [...trace, ref]);
  }

  if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    return mergeAllOfSchema(schema, document, trace);
  }

  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const first = resolveSchema(schema.oneOf[0], document, trace);
    return { ...schema, ...first };
  }

  return schema;
}

function mergeAllOfSchema(schema: OpenApiSchema, document: OpenApiDocument, trace: string[]): OpenApiSchema {
  const merged: OpenApiSchema = {
    type: schema.type,
    format: schema.format,
    properties: {},
    required: []
  };

  const candidates = [...(schema.allOf ?? [])];
  for (const candidate of candidates) {
    const resolved = resolveSchema(candidate, document, trace);
    if (!merged.type && resolved.type) {
      merged.type = resolved.type;
    }
    if (!merged.format && resolved.format) {
      merged.format = resolved.format;
    }
    if (resolved.properties) {
      merged.properties = { ...(merged.properties ?? {}), ...resolved.properties };
    }
    if (resolved.required) {
      merged.required = Array.from(new Set([...(merged.required ?? []), ...resolved.required]));
    }
    if (resolved.enum && !merged.enum) {
      merged.enum = resolved.enum;
    }
    if (resolved.items && !merged.items) {
      merged.items = resolved.items;
    }
  }

  return merged;
}

function getRequestBodySchema(operation: OperationObject): OpenApiSchema | undefined {
  const content = operation.requestBody?.content;
  if (!content || typeof content !== 'object') {
    return undefined;
  }
  if (content['application/json']?.schema) {
    return content['application/json'].schema;
  }
  const first = Object.values(content)[0];
  return first?.schema;
}


function createSelectField(name: string, label: string, required: boolean, options: unknown[], multiple: boolean = false): FieldDescriptor {
  return {
    kind: 'Select',
    name,
    label,
    required,
    multiple,
    options: options.map(item => ({ label: String(item), value: String(item) }))
  };
}

function createInputField(
  name: string,
  label: string,
  required: boolean,
  inputType: FieldDescriptor['inputType'] = 'text'
): FieldDescriptor {
  return {
    kind: 'Input',
    name,
    label,
    required,
    inputType
  };
}

function mapSchemaToField(
  name: string,
  schema: OpenApiSchema,
  required: boolean,
  document: OpenApiDocument
): FieldDescriptor {
  const resolved = resolveSchema(schema, document);
  const label = toLabel(name);

  if (Array.isArray(resolved.enum) && resolved.enum.length > 0) {
    return createSelectField(name, label, required, resolved.enum);
  }

  if (resolved.type === 'array' && resolved.items) {
    const item = resolveSchema(resolved.items, document);
    if (Array.isArray(item.enum) && item.enum.length > 0) {
      return createSelectField(name, label, required, item.enum, true);
    }
    return createInputField(name, label, required, 'multiline');
  }

  if (resolved.type === 'boolean') {
    return {
      kind: 'Checkbox',
      name,
      label,
      required
    };
  }

  if (resolved.type === 'integer' || resolved.type === 'number') {
    return createInputField(name, label, required, 'number');
  }

  if (resolved.type === 'string' && resolved.format === 'email') {
    return createInputField(name, label, required, 'email');
  }

  if (resolved.type === 'string' && resolved.format === 'password') {
    return createInputField(name, label, required, 'password');
  }

  if (resolved.type === 'string' && (resolved.format === 'date' || resolved.format === 'date-time')) {
    return {
      kind: 'DatePicker',
      name,
      label,
      required
    };
  }

  if (resolved.type === 'object' || resolved.properties) {
    return createInputField(name, label, required, 'multiline');
  }

  return createInputField(name, label, required, 'text');
}


function buildOperationList(document: OpenApiDocument): ResolvedOperation[] {
  const paths = document.paths;
  if (!paths || typeof paths !== 'object') {
    return [];
  }

  const operations: ResolvedOperation[] = [];
  for (const [pathName, pathItem] of sortObjectKeys(paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) {
        continue;
      }
      const fallbackId = `${method}-${pathName}`;
      operations.push({
        method,
        path: pathName,
        operationId: operation.operationId ?? sanitizeId(fallbackId),
        operation
      });
    }
  }

  return operations;
}

function selectOperation(document: OpenApiDocument, requestedOperationId?: string): ResolvedOperation {
  const operations = buildOperationList(document);
  if (operations.length === 0) {
    throw new Error('OpenAPI document has no operations.');
  }

  if (requestedOperationId) {
    const matched = operations.find(operation => operation.operationId === requestedOperationId);
    if (!matched) {
      throw new Error(`operationId not found: ${requestedOperationId}`);
    }
    return matched;
  }

  const candidate = operations.find(operation => {
    const hasBody = Boolean(getRequestBodySchema(operation.operation));
    const hasParams = Array.isArray(operation.operation.parameters) && operation.operation.parameters.length > 0;
    return hasBody || hasParams;
  });

  if (!candidate) {
    throw new Error('No importable operation found (requestBody/parameters missing).');
  }

  return candidate;
}

function buildFieldDescriptors(operation: ResolvedOperation, document: OpenApiDocument): FieldDescriptor[] {
  const fields: FieldDescriptor[] = [];
  const seen = new Set<string>();

  const bodySchema = getRequestBodySchema(operation.operation);
  if (bodySchema) {
    const resolved = resolveSchema(bodySchema, document);
    const properties = resolved.properties ?? {};
    const requiredSet = new Set(resolved.required ?? []);
    for (const [name, propSchema] of sortObjectKeys(properties)) {
      fields.push(mapSchemaToField(name, propSchema, requiredSet.has(name), document));
      seen.add(name);
    }
  }

  const parameters = operation.operation.parameters ?? [];
  for (const parameter of parameters) {
    if (!parameter || !parameter.name || seen.has(parameter.name)) {
      continue;
    }
    const paramSchema = parameter.schema ?? { type: 'string' };
    fields.push(mapSchemaToField(parameter.name, paramSchema, Boolean(parameter.required), document));
    seen.add(parameter.name);
  }

  return fields;
}


function buildFormFieldComponent(field: FieldDescriptor): Record<string, unknown> {
  if (field.kind === 'Checkbox') {
    return {
      Checkbox: {
        label: field.label,
        name: field.name,
        required: field.required
      }
    };
  }

  if (field.kind === 'Select') {
    return {
      Select: {
        label: field.label,
        name: field.name,
        options: field.options ?? [],
        multiple: Boolean(field.multiple)
      }
    };
  }

  if (field.kind === 'DatePicker') {
    return {
      DatePicker: {
        label: field.label,
        name: field.name,
        required: field.required
      }
    };
  }

  return {
    Input: {
      label: field.label,
      name: field.name,
      type: field.inputType ?? 'text',
      required: field.required
    }
  };
}

function buildDsl(operation: ResolvedOperation, fields: FieldDescriptor[]): TextUIDSL {
  if (fields.length === 0) {
    throw new Error(`operation has no importable fields: ${operation.operationId}`);
  }

  const pageId = sanitizeId(operation.operationId);
  const title = operation.operation.summary ?? operation.operationId;

  const formFields = fields.map(buildFormFieldComponent);

  return {
    page: {
      id: pageId,
      title,
      layout: 'vertical',
      components: [
        {
          Text: {
            variant: 'h1',
            value: title
          }
        },
        {
          Form: {
            id: `${pageId}-form`,
            fields: formFields,
            actions: [
              {
                Button: {
                  kind: 'submit',
                  label: '送信',
                  submit: true
                }
              }
            ]
          }
        }
      ]
    }
  };
}


function toSourceOperation(operation: ResolvedOperation): string {
  return `${operation.method.toUpperCase()} ${operation.path}`;
}

function createImportResult(operation: ResolvedOperation, document: OpenApiDocument): OpenApiImportResult | null {
  const fields = buildFieldDescriptors(operation, document);
  if (fields.length === 0) {
    return null;
  }

  const dsl = buildDsl(operation, fields);
  const yaml = YAML.stringify(dsl, { lineWidth: 0 });

  return {
    dsl,
    yaml,
    operationId: operation.operationId,
    sourceOperation: toSourceOperation(operation),
    fields: fields.length
  };
}

export function importOpenApiToDsl(params: {
  inputPath: string;
  operationId?: string;
}): OpenApiImportResult {
  const document = loadOpenApiFile(params.inputPath);
  const selected = selectOperation(document, params.operationId);
  const result = createImportResult(selected, document);
  if (!result) {
    throw new Error(`operation has no importable fields: ${selected.operationId}`);
  }
  return result;
}

export function importAllOpenApiToDsl(params: {
  inputPath: string;
}): OpenApiImportResult[] {
  const document = loadOpenApiFile(params.inputPath);
  const operations = buildOperationList(document);
  if (operations.length === 0) {
    throw new Error('OpenAPI document has no operations.');
  }

  const results: OpenApiImportResult[] = [];
  for (const operation of operations) {
    const result = createImportResult(operation, document);
    if (result) {
      results.push(result);
    }
  }

  if (results.length === 0) {
    throw new Error('No importable operations found (requestBody/parameters missing).');
  }

  return results;
}
