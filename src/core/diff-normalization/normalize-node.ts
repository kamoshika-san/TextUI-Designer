/**
 * normalizeNode — Synonym-structure expansion for semantic diff (SD004 + SD005)
 *
 * --------------------------------------------------------------------------
 * Normalization Specification (SD004): Synonym Structure Patterns
 * --------------------------------------------------------------------------
 *
 * ## BOX SHORTHAND (padding, margin)
 *
 * Scalar number or string:
 *   padding: 8  →  {top: 8, right: 8, bottom: 8, left: 8}
 *
 * 2-element array (vertical | horizontal):
 *   padding: [8, 16]  →  {top: 8, right: 16, bottom: 8, left: 16}
 *
 * 4-element array (top | right | bottom | left):
 *   padding: [8, 16, 4, 12]  →  {top: 8, right: 16, bottom: 4, left: 12}
 *
 * Object form is canonical; missing sides default to 0:
 *   padding: {top: 8}  →  {top: 8, right: 0, bottom: 0, left: 0}
 *
 * ## GAP SHORTHAND (gap)
 *
 * Scalar:
 *   gap: 8  →  {row: 8, col: 8}
 *
 * 2-element array (row | col):
 *   gap: [8, 16]  →  {row: 8, col: 16}
 *
 * Object form is canonical; missing keys default to 0:
 *   gap: {row: 8}  →  {row: 8, col: 0}
 *
 * ## Recursion
 * normalizeNode recurses into nested plain-object values.
 * Array elements that are plain objects are also normalized.
 * Non-object leaves are passed through unchanged.
 *
 * --------------------------------------------------------------------------
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumberOrString(value: unknown): value is number | string {
  return typeof value === 'number' || typeof value === 'string';
}

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return isNaN(n) ? 0 : n;
}

/**
 * Expand a box shorthand value (padding/margin) into {top, right, bottom, left}.
 */
function expandBoxShorthand(value: unknown): { top: number; right: number; bottom: number; left: number } {
  if (isNumberOrString(value)) {
    const n = toNum(value);
    return { top: n, right: n, bottom: n, left: n };
  }
  if (Array.isArray(value)) {
    if (value.length === 2) {
      const [v, h] = [toNum(value[0]), toNum(value[1])];
      return { top: v, right: h, bottom: v, left: h };
    }
    if (value.length >= 4) {
      return {
        top: toNum(value[0]),
        right: toNum(value[1]),
        bottom: toNum(value[2]),
        left: toNum(value[3])
      };
    }
    // 1 or 3 elements — treat as scalar using first value
    const n = value.length > 0 ? toNum(value[0]) : 0;
    return { top: n, right: n, bottom: n, left: n };
  }
  if (isRecord(value)) {
    return {
      top: toNum(value['top'] ?? 0),
      right: toNum(value['right'] ?? 0),
      bottom: toNum(value['bottom'] ?? 0),
      left: toNum(value['left'] ?? 0)
    };
  }
  return { top: 0, right: 0, bottom: 0, left: 0 };
}

/**
 * Expand a gap shorthand value into {row, col}.
 */
function expandGapShorthand(value: unknown): { row: number; col: number } {
  if (isNumberOrString(value)) {
    const n = toNum(value);
    return { row: n, col: n };
  }
  if (Array.isArray(value) && value.length >= 2) {
    return { row: toNum(value[0]), col: toNum(value[1]) };
  }
  if (isRecord(value)) {
    return {
      row: toNum(value['row'] ?? 0),
      col: toNum(value['col'] ?? 0)
    };
  }
  return { row: 0, col: 0 };
}

/**
 * Normalize a raw DSL node by expanding synonym structures into their
 * canonical object form.
 *
 * - `padding` / `margin`: expanded to `{top, right, bottom, left}`
 * - `gap`: expanded to `{row, col}`
 * - Nested objects are recursively normalized.
 * - Non-object values are passed through unchanged.
 *
 * @param node  Raw YAML node (any value from parsed DSL).
 * @returns     Normalized node (new object; input is not mutated).
 */
export function normalizeNode(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(item => normalizeNode(item));
  }
  if (!isRecord(node)) {
    return node;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === 'padding' || key === 'margin') {
      result[key] = expandBoxShorthand(value);
    } else if (key === 'gap') {
      result[key] = expandGapShorthand(value);
    } else if (isRecord(value)) {
      result[key] = normalizeNode(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => normalizeNode(item));
    } else {
      result[key] = value;
    }
  }
  return result;
}
