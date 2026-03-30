/**
 * Stage1: Structural Canonicalization.
 *
 * Accepts a DSL that has passed Stage0 intake and applies structural
 * canonicalization rules: ordering children deterministically, and
 * unifying equivalent structural representations.
 *
 * Design constraints (over-normalization guard):
 *   - Only allowlisted rules are applied.
 *   - Rules may NOT change the semantic meaning of the DSL.
 *   - Each applied rule is appended to trace.appliedRules with a 'stage1-' prefix.
 *   - Stage0 trace data is preserved and merged into the output trace.
 */

import type { TextUIDSL } from '../../domain/dsl-types';
import type { ComponentDef } from '../../domain/dsl-types/component-def';
import type { NormalizationTrace } from './types';

// ---------------------------------------------------------------------------
// Default allowlist
// ---------------------------------------------------------------------------

/**
 * Default allowlist for Stage1 structural rules.
 * Callers may override via NormalizeOptions.allowedRules.
 */
export const STAGE1_DEFAULT_ALLOWED_RULES: readonly string[] = [
  'stage1-sort-children-by-token',
  'stage1-sort-children-by-type-index'
] as const;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface Stage1Result {
  dsl: TextUIDSL;
  trace: NormalizationTrace;
}

/**
 * Run Stage1 structural canonicalization.
 *
 * @param dsl    DSL that has passed Stage0 intake (not mutated).
 * @param trace  Trace from Stage0 (will be cloned and extended).
 * @param allowedRules  Override the default rule allowlist. Pass undefined for defaults.
 * @returns A new Stage1Result with the canonicalized DSL and extended trace.
 */
export function runStage1Structural(
  dsl: TextUIDSL,
  trace: NormalizationTrace,
  allowedRules?: readonly string[]
): Stage1Result {
  const effectiveRules = allowedRules ?? STAGE1_DEFAULT_ALLOWED_RULES;

  // Clone trace so Stage0 data is preserved
  const outTrace: NormalizationTrace = {
    entityPathMap: { ...trace.entityPathMap },
    explicitnessMap: { ...trace.explicitnessMap },
    ownershipMap: { ...trace.ownershipMap },
    appliedRules: [...trace.appliedRules],
    warnings: [...trace.warnings]
  };

  // Apply structural rules to the component list
  const canonicalized = canonicalizeComponents(
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
 * Apply structural canonicalization to a component list.
 * Modifies `trace` in-place (already cloned by caller).
 */
function canonicalizeComponents(
  components: ComponentDef[],
  allowedRules: readonly string[],
  trace: NormalizationTrace,
  pathPrefix: string
): ComponentDef[] {
  if (components.length === 0) { return []; }

  let result = [...components];

  // Rule: stage1-sort-children-by-token
  // Sort components that have a `token` field deterministically by token value.
  // Components without a token retain their relative order (stable sort subset).
  if (allowedRules.includes('stage1-sort-children-by-token')) {
    const hasToken = result.every(c => hasTokenField(c));
    if (hasToken) {
      const before = result.map(c => getToken(c)).join(',');
      result = stableSortByToken(result);
      const after = result.map(c => getToken(c)).join(',');
      if (before !== after) {
        trace.appliedRules.push('stage1-sort-children-by-token');
      }
    }
  }

  // Rule: stage1-sort-children-by-type-index
  // When no tokens present, sort by component type name for determinism.
  if (
    allowedRules.includes('stage1-sort-children-by-type-index') &&
    !trace.appliedRules.includes('stage1-sort-children-by-token')
  ) {
    const noTokens = result.every(c => !hasTokenField(c));
    if (noTokens && result.length > 1) {
      const before = result.map(c => getComponentType(c)).join(',');
      result = stableSortByType(result);
      const after = result.map(c => getComponentType(c)).join(',');
      if (before !== after) {
        trace.appliedRules.push('stage1-sort-children-by-type-index');
      }
    }
  }

  // Recurse into nested component arrays (Container, Accordion, Tabs, etc.)
  result = result.map((comp, i) =>
    canonicalizeComponentNested(comp, allowedRules, trace, `${pathPrefix}[${i}]`)
  );

  // Record ownership for this path
  trace.ownershipMap[pathPrefix] = 'stage1-structural';

  return result;
}

function canonicalizeComponentNested(
  comp: ComponentDef,
  allowedRules: readonly string[],
  trace: NormalizationTrace,
  path: string
): ComponentDef {
  const kind = getComponentType(comp);
  const props = (comp as Record<string, unknown>)[kind] as Record<string, unknown>;
  if (!props || typeof props !== 'object') { return comp; }

  let mutated = false;
  const newProps: Record<string, unknown> = { ...props };

  for (const key of ['components', 'items', 'children'] as const) {
    if (key in props && Array.isArray(props[key])) {
      const nested = props[key] as ComponentDef[];
      const nestedComps = nested.filter(
        item => item && typeof item === 'object' && Object.keys(item).length === 1
      ) as ComponentDef[];
      if (nestedComps.length > 0) {
        const canonicalized = canonicalizeComponents(
          nestedComps,
          allowedRules,
          trace,
          `${path}.${key}`
        );
        // Only replace if something changed
        if (canonicalized !== nestedComps) {
          newProps[key] = canonicalized;
          mutated = true;
        }
      }
    }
  }

  if (!mutated) { return comp; }
  return { [kind]: newProps } as unknown as ComponentDef;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getComponentType(comp: ComponentDef): string {
  return Object.keys(comp)[0] ?? '';
}

function hasTokenField(comp: ComponentDef): boolean {
  const kind = getComponentType(comp);
  const props = (comp as Record<string, unknown>)[kind];
  return !!(props && typeof props === 'object' && 'token' in (props as object));
}

function getToken(comp: ComponentDef): string {
  const kind = getComponentType(comp);
  const props = (comp as Record<string, unknown>)[kind] as Record<string, unknown>;
  return String(props?.token ?? '');
}

function stableSortByToken(components: ComponentDef[]): ComponentDef[] {
  return [...components].sort((a, b) => {
    const ta = getToken(a);
    const tb = getToken(b);
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

function stableSortByType(components: ComponentDef[]): ComponentDef[] {
  return [...components].sort((a, b) => {
    const ta = getComponentType(a);
    const tb = getComponentType(b);
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}
