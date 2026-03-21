import type { TextUIDSL } from '../domain/dsl-types';
import { getSupportedProviderNames, runExport } from '../cli/exporter-runner';
import { validateDsl } from '../cli/validator';
import { previewSchemaValue } from './textui-core-helpers';
import type { ValidationResult } from '../cli/types';

/**
 * I/O 層:
 * - 外部 provider の実行 (runExport)
 * - DSL validation (validateDsl: token/theme 読み込み含む)
 * - スキーマプレビュー（ファイル読み込み含む）
 * - 対応 provider 名の列挙
 *
 * Domain / Format は外に逃がし、ここでは I/O 依存だけを閉じ込める。
 */

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
  normalizedDsl: TextUIDSL,
  options: { sourcePath?: string; skipTokenValidation?: boolean } = {}
): ValidationResult {
  return validateDsl(normalizedDsl, {
    sourcePath: options.sourcePath,
    skipTokenValidation: options.skipTokenValidation
  });
}

export function previewSchemaValueIo(
  schema: 'main' | 'template' | 'theme',
  jsonPointer?: string
): unknown {
  return previewSchemaValue(schema, jsonPointer);
}

export async function getSupportedProvidersIo(): Promise<string[]> {
  return getSupportedProviderNames();
}

