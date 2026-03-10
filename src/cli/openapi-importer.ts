import { createImportResult } from './openapi/dsl-builder';
import { loadOpenApiFile } from './openapi/loader';
import { buildOperationList, selectOperation } from './openapi/operation-selector';
import type { OpenApiImportResult } from './openapi/types';

export type { OpenApiImportResult };

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
