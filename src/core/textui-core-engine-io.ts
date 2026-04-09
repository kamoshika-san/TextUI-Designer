import type { NavigationFlowDSL, TextUIDSL } from '../domain/dsl-types';
import { getSupportedProviderNames, runExport } from '../cli/exporter-runner';
import { validateDsl } from '../cli/validator';
import { previewSchemaValue } from './textui-core-helpers';
import type { ValidationResult } from '../cli/types';

export async function exportUiDslToCode(
  dsl: TextUIDSL,
  format: string,
  options: { providerModulePath?: string; themePath?: string } = {}
): Promise<string> {
  return runExport(dsl, format, {
    providerModulePath: options.providerModulePath,
    themePath: options.themePath
  });
}

export function validateNormalizedDslIo(
  normalizedDsl: TextUIDSL | NavigationFlowDSL,
  options: { sourcePath?: string; skipTokenValidation?: boolean; schemaKind?: 'main' | 'navigation' } = {}
): ValidationResult {
  return validateDsl(normalizedDsl, {
    sourcePath: options.sourcePath,
    skipTokenValidation: options.skipTokenValidation,
    schemaKind: options.schemaKind
  });
}

export function previewSchemaValueIo(
  schema: 'main' | 'template' | 'theme' | 'navigation',
  jsonPointer?: string
): unknown {
  return previewSchemaValue(schema, jsonPointer);
}

export async function getSupportedProvidersIo(): Promise<string[]> {
  return getSupportedProviderNames();
}
