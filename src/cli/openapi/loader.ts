import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';
import type { OpenApiDocument } from './types';

export function loadOpenApiFile(inputPath: string): OpenApiDocument {
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
