import * as YAML from 'yaml';
import type { ValidationResult } from '../cli/types';
import type { TextUIDSL } from '../renderer/types';
import type { ValidateUiResponse } from './textui-core-engine';
import { mapDiagnostic } from './textui-core-helpers';

/**
 * Format 層:
 * - YAML stringify
 * - validation response shaping（normalizedDsl / normalizedYaml 含む）
 */

export function stringifyUiYaml(dsl: TextUIDSL): string {
  return YAML.stringify(dsl);
}

export function stringifyNormalizedYaml(normalizedDsl: TextUIDSL): string {
  return YAML.stringify(normalizedDsl);
}

export function toCoreValidationResponse(
  result: ValidationResult,
  normalizedDsl: TextUIDSL
): ValidateUiResponse {
  return {
    valid: result.valid,
    diagnostics: result.issues.map(issue => mapDiagnostic(issue)),
    normalizedDsl,
    normalizedYaml: stringifyNormalizedYaml(normalizedDsl)
  };
}

