import type { OpenApiSchema, OperationObject } from './types';

export function getRequestBodySchema(operation: OperationObject): OpenApiSchema | undefined {
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
