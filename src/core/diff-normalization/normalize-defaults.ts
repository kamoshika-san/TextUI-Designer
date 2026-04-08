/**
 * normalizeDefaults — Default-value fill-in for semantic diff (SD006)
 *
 * --------------------------------------------------------------------------
 * Normalization Specification (SD004): Default Value Patterns
 * --------------------------------------------------------------------------
 *
 * When a component node omits optional boolean fields that have a known
 * default, normalizeDefaults fills them in so that semantic diff treats
 * `{label: 'OK'}` and `{label: 'OK', disabled: false}` as equivalent.
 *
 * Default rules applied at the top level of a component node:
 *
 *   disabled  →  false   (absent means not disabled)
 *   required  →  false   (absent means not required)
 *   visible   →  true    (absent means visible)
 *   submit    →  false   (absent means not a submit action)
 *
 * Rules:
 *   - Only fills when the field is completely absent (not set to null/undefined).
 *   - Explicit author values are never overwritten.
 *   - Does not recurse into nested sub-objects (defaults are component-scoped).
 *   - Non-object inputs are returned unchanged.
 *
 * --------------------------------------------------------------------------
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Default field values for component nodes. */
const FIELD_DEFAULTS: ReadonlyArray<[string, unknown]> = [
  ['disabled', false],
  ['required', false],
  ['visible', true],
  ['submit', false]
];

/**
 * Fill in omitted fields with their default values for semantic equivalence.
 *
 * Only fills known boolean defaults for component-level properties.
 * Explicit author-set values are never modified.
 *
 * @param node  Raw component value node (any value from parsed DSL).
 * @returns     Node with defaults applied (new object; input is not mutated).
 */
export function normalizeDefaults(node: unknown): unknown {
  if (!isRecord(node)) {
    return node;
  }

  const result: Record<string, unknown> = { ...node };

  for (const [field, defaultValue] of FIELD_DEFAULTS) {
    if (!(field in result)) {
      result[field] = defaultValue;
    }
  }

  return result;
}
