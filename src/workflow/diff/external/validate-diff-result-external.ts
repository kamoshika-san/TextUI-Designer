/**
 * validateDiffResultExternal: JSON Schema validation for DiffResultExternal.
 *
 * Purpose (T-20260401-002, Epic L Sprint L1):
 *   Validate that a DiffResultExternal payload produced by buildDiffResultExternal()
 *   conforms to the external contract schema (schemas/diff-result-external-v0.json).
 *   Invalid payloads are rejected with a DiffExternalContractError before artifact
 *   writing is allowed (fail-fast pattern).
 *
 * Design rules:
 *   - Uses `ajv` (already a project dependency) for JSON Schema draft-07 validation.
 *   - The schema is loaded once at module init and compiled for reuse.
 *   - Returns a Result<DiffResultExternal, DiffExternalContractError> — no throws.
 */

import Ajv from 'ajv';
import * as path from 'path';
import * as fs from 'fs';
import type { DiffResultExternal } from '../../../core/textui-diff-result-external';

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

/**
 * Error returned when a DiffResultExternal payload fails schema validation.
 */
export interface DiffExternalContractError {
  errorKind: 'schema-validation-error';
  message: string;
  validationErrors: DiffExternalValidationError[];
}

export interface DiffExternalValidationError {
  /** JSON Pointer path to the field that failed, e.g. "/events/0/kind" */
  instancePath: string;
  /** Human-readable message from AJV, e.g. "must be equal to one of the allowed values" */
  message: string;
  /** AJV keyword that triggered the error, e.g. "enum", "required", "type" */
  keyword: string;
}

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type ValidateOk = { ok: true; payload: DiffResultExternal };
export type ValidateFail = { ok: false; error: DiffExternalContractError };
export type ValidateResult = ValidateOk | ValidateFail;

// ---------------------------------------------------------------------------
// Schema loading + validator compilation (module-level singleton)
// ---------------------------------------------------------------------------

let _validate: ReturnType<Ajv['compile']> | undefined;

function getValidator(): ReturnType<Ajv['compile']> {
  if (_validate) {
    return _validate;
  }

  // Resolve schema path relative to project root.
  // Works both from src/ (ts-node / IDE) and from out/ (compiled JS).
  const projectRoot = path.resolve(__dirname, '..', '..', '..', '..');
  const schemaPath = path.join(projectRoot, 'schemas', 'diff-result-external-v0.json');

  const schemaText = fs.readFileSync(schemaPath, 'utf8');
  const schema = JSON.parse(schemaText) as object;

  const ajv = new Ajv({ allErrors: true, strict: false });
  _validate = ajv.compile(schema);
  return _validate;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a DiffResultExternal payload against the external contract schema.
 *
 * @param payload   The payload to validate (typically from buildDiffResultExternal).
 * @returns         ValidateOk with the validated payload, or ValidateFail with a
 *                  DiffExternalContractError describing the schema violations.
 */
export function validateDiffResultExternal(payload: DiffResultExternal): ValidateResult {
  const validate = getValidator();
  const valid = validate(payload);

  if (valid) {
    return { ok: true, payload };
  }

  const validationErrors: DiffExternalValidationError[] = (validate.errors ?? []).map(err => ({
    instancePath: err.instancePath ?? '',
    message: err.message ?? 'unknown validation error',
    keyword: err.keyword ?? ''
  }));

  const error: DiffExternalContractError = {
    errorKind: 'schema-validation-error',
    message: `DiffResultExternal failed schema validation: ${validationErrors.map(e => `${e.instancePath} ${e.message}`).join('; ')}`,
    validationErrors
  };

  return { ok: false, error };
}

/**
 * Reset the compiled validator (for testing with custom schemas).
 * @internal
 */
export function _resetValidatorForTesting(): void {
  _validate = undefined;
}
