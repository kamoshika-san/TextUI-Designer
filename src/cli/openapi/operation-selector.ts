import { getRequestBodySchema } from './request-body';
import { sanitizeId, sortObjectKeys } from './utils';
import type { OpenApiDocument, ResolvedOperation } from './types';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

export function buildOperationList(document: OpenApiDocument): ResolvedOperation[] {
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

export function selectOperation(document: OpenApiDocument, requestedOperationId?: string): ResolvedOperation {
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
