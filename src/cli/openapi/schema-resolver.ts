import type { OpenApiDocument, OpenApiSchema } from './types';

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

function mergeAllOfSchema(schema: OpenApiSchema, document: OpenApiDocument, trace: string[]): OpenApiSchema {
  const merged: OpenApiSchema = {
    type: schema.type,
    format: schema.format,
    properties: {},
    required: []
  };

  for (const candidate of schema.allOf ?? []) {
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

export function resolveSchema(schema: OpenApiSchema | undefined, document: OpenApiDocument, trace: string[] = []): OpenApiSchema {
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
