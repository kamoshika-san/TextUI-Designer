import { getRequestBodySchema } from './request-body';
import { resolveSchema } from './schema-resolver';
import type { FieldDescriptor, OpenApiDocument, OpenApiSchema, ResolvedOperation } from './types';
import { sortObjectKeys } from './utils';

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

function mapSchemaToField(name: string, schema: OpenApiSchema, required: boolean, document: OpenApiDocument): FieldDescriptor {
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

export function buildFieldDescriptors(operation: ResolvedOperation, document: OpenApiDocument): FieldDescriptor[] {
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

  for (const parameter of operation.operation.parameters ?? []) {
    if (!parameter || !parameter.name || seen.has(parameter.name)) {
      continue;
    }

    const paramSchema = parameter.schema ?? { type: 'string' };
    fields.push(mapSchemaToField(parameter.name, paramSchema, Boolean(parameter.required), document));
    seen.add(parameter.name);
  }

  return fields;
}
