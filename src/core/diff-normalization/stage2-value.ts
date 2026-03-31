/**
 * Stage2: Value Equivalence Canonicalization.
 *
 * Accepts a DSL that has passed Stage0 and Stage1, and applies value-level
 * canonicalization rules:
 *   - Numeric strings → numbers (where the DSL schema expects a number)
 *   - Empty string → omit (for fields where empty-string equals absent)
 *   - Boolean shorthand normalization (no-op for now; reserved)
 *
 * Design constraints (over-normalization guard):
 *   - Only allowlisted rules are applied.
 *   - Rules may NOT change the semantic meaning of the DSL.
 *   - Each applied rule is appended to trace.appliedRules with a 'stage2-' prefix.
 *   - Stage0 and Stage1 trace data is preserved and merged into the output trace.
 *   - Explicit author values are marked as 'explicit' in explicitnessMap;
 *     normalizer-filled values are marked as 'inferred'.
 */

import type { TextUIDSL } from '../../domain/dsl-types';
import type { ComponentDef } from '../../domain/dsl-types/component-def';
import type { NormalizationTrace } from './types';

// ---------------------------------------------------------------------------
// Default allowlist
// ---------------------------------------------------------------------------

/**
 * Default allowlist for Stage2 value rules.
 * Callers may override via the allowedRules parameter.
 */
export const STAGE2_DEFAULT_ALLOWED_RULES: readonly string[] = [
  'stage2-numeric-string-to-number',
  'stage2-trim-empty-string'
] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface Stage2Result {
  dsl: TextUIDSL;
  trace: NormalizationTrace;
}

/**
 * Run Stage2 value equivalence canonicalization.
 *
 * @param dsl    DSL from Stage1 (not mutated).
 * @param trace  Trace from Stage1 (will be cloned and extended).
 * @param allowedRules  Override the default rule allowlist. Pass undefined for defaults.
 * @returns A new Stage2Result with the canonicalized DSL and extended trace.
 */
export function runStage2Value(
  dsl: TextUIDSL,
  trace: NormalizationTrace,
  allowedRules?: readonly string[]
): Stage2Result {
  const effectiveRules = allowedRules ?? STAGE2_DEFAULT_ALLOWED_RULES;

  // Clone trace so Stage0+Stage1 data is preserved
  const outTrace: NormalizationTrace = {
    entityPathMap: { ...trace.entityPathMap },
    explicitnessMap: { ...trace.explicitnessMap },
    ownershipMap: { ...trace.ownershipMap },
    appliedRules: [...trace.appliedRules],
    warnings: [...trace.warnings]
  };

  // Apply value canonicalization to the component list
  const canonicalized = canonicalizeComponentValues(
    dsl.page.components,
    effectiveRules,
    outTrace,
    'page.components'
  );

  const outDsl: TextUIDSL = {
    page: {
      ...dsl.page,
      components: canonicalized
    }
  };

  return { dsl: outDsl, trace: outTrace };
}

// ---------------------------------------------------------------------------
// Rule implementations
// ---------------------------------------------------------------------------

/**
 * Fields that are safe to coerce from numeric string to number.
 * Must be explicitly listed to prevent over-normalization.
 */
const NUMERIC_COERCE_FIELDS: readonly string[] = [
  'flexGrow',
  'flexShrink',
  'rows',
  'cols',
  'colspan',
  'rowspan',
  'tabIndex',
  'progress'
] as const;

/**
 * Apply value canonicalization to a component list.
 * Modifies `trace` in-place (already cloned by caller).
 */
function canonicalizeComponentValues(
  components: ComponentDef[],
  allowedRules: readonly string[],
  trace: NormalizationTrace,
  pathPrefix: string
): ComponentDef[] {
  if (components.length === 0) { return []; }

  return components.map((comp, i) =>
    canonicalizeComponentValuesSingle(
      comp,
      allowedRules,
      trace,
      `${pathPrefix}[${i}]`
    )
  );
}

function canonicalizeComponentValuesSingle(
  comp: ComponentDef,
  allowedRules: readonly string[],
  trace: NormalizationTrace,
  path: string
): ComponentDef {
  const kind = Object.keys(comp)[0] as string;
  if (!kind) { return comp; }

  const props = (comp as Record<string, unknown>)[kind] as Record<string, unknown>;
  if (!props || typeof props !== 'object') { return comp; }

  let mutated = false;
  const newProps: Record<string, unknown> = { ...props };

  // Rule: stage2-numeric-string-to-number
  // Convert fields listed in NUMERIC_COERCE_FIELDS from string to number if applicable.
  if (allowedRules.includes('stage2-numeric-string-to-number')) {
    for (const field of NUMERIC_COERCE_FIELDS) {
      if (field in newProps && typeof newProps[field] === 'string') {
        const coerced = Number(newProps[field]);
        if (!isNaN(coerced) && String(coerced) === (newProps[field] as string).trim()) {
          const fieldPath = `${path}.${field}`;
          trace.explicitnessMap[fieldPath] = 'inferred';
          newProps[field] = coerced;
          mutated = true;
          if (!trace.appliedRules.includes('stage2-numeric-string-to-number')) {
            trace.appliedRules.push('stage2-numeric-string-to-number');
          }
        }
      }
    }
  }

  // Rule: stage2-trim-empty-string
  // Remove string fields whose value is '' (empty string equals absent for string fields).
  // Safety: only remove if the field is not a required field (token, id, label, title, text, href, src).
  const NEVER_TRIM_FIELDS = new Set(['token', 'id', 'label', 'title', 'text', 'href', 'src', 'value', 'placeholder']);
  if (allowedRules.includes('stage2-trim-empty-string')) {
    for (const field of Object.keys(newProps)) {
      if (
        !NEVER_TRIM_FIELDS.has(field) &&
        typeof newProps[field] === 'string' &&
        (newProps[field] as string).length === 0
      ) {
        const fieldPath = `${path}.${field}`;
        trace.explicitnessMap[fieldPath] = 'inferred';
        delete newProps[field];
        mutated = true;
        if (!trace.appliedRules.includes('stage2-trim-empty-string')) {
          trace.appliedRules.push('stage2-trim-empty-string');
        }
      }
    }
  }

  // Record ownership for this path
  trace.ownershipMap[path] = 'stage2-value';

  // Recurse into nested component arrays (Container, Accordion, Tabs, etc.)
  for (const key of ['components', 'items', 'children'] as const) {
    if (key in newProps && Array.isArray(newProps[key])) {
      const nested = newProps[key] as ComponentDef[];
      const nestedComps = nested.filter(
        item => item && typeof item === 'object' && Object.keys(item).length === 1
      ) as ComponentDef[];
      if (nestedComps.length > 0) {
        const canonicalized = canonicalizeComponentValues(
          nestedComps,
          allowedRules,
          trace,
          `${path}.${key}`
        );
        newProps[key] = canonicalized;
        mutated = true;
      }
    }
  }

  if (!mutated) { return comp; }
  return { [kind]: newProps } as unknown as ComponentDef;
}
