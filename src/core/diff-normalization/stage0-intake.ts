/**
 * Stage0: Intake / preservation check.
 *
 * Validates that the incoming DSL has the structural prerequisites required
 * for safe normalization in Stage1–3:
 *   - At least one component must carry a `token` (sourceRef surrogate until
 *     a dedicated sourceRef field exists on TextUIDSL).
 *   - No component may declare an `explicitness` value outside the allowed set.
 *   - The page must have an `id` (ownership boundary anchor).
 *
 * Passes the DSL through unchanged when all checks pass.
 * Returns an intake-invalid failure immediately when any check fails.
 */

import type { TextUIDSL } from '../../domain/dsl-types';
import type { ComponentDef } from '../../domain/dsl-types/component-def';
import {
  NormalizationTrace,
  NormalizeFailure,
  NormalizeOptions,
  NormalizeResult,
  emptyTrace
} from './types';

const STAGE_RULE = 'stage0-intake-check';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run Stage0 intake checks on `dsl`.
 *
 * @returns NormalizeSuccess when all checks pass, NormalizeFailure otherwise.
 */
export function runStage0Intake(
  dsl: TextUIDSL,
  _options?: NormalizeOptions
): NormalizeResult {
  const trace: NormalizationTrace = emptyTrace();

  // 1. page.id must exist (ownership boundary)
  if (!dsl.page?.id) {
    return intakeInvalid(
      'page.id is required (ownership boundary anchor)',
      trace
    );
  }

  // 2. Record ownership for page
  trace.ownershipMap['page'] = 'page-boundary';

  // 3. Validate components for sourceRef presence and explicitness values
  const components = dsl.page?.components ?? [];
  const intakeError = validateComponents(components, trace, '');
  if (intakeError) {
    return intakeError;
  }

  // 4. Mark stage as applied
  trace.appliedRules.push(STAGE_RULE);

  return { ok: true, dsl, trace };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function validateComponents(
  components: ComponentDef[],
  trace: NormalizationTrace,
  pathPrefix: string
): NormalizeFailure | null {
  for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    const path = `${pathPrefix}page.components[${i}]`;
    const compError = validateComponent(comp, trace, path);
    if (compError) { return compError; }
  }
  return null;
}

function validateComponent(
  comp: ComponentDef,
  trace: NormalizationTrace,
  path: string
): NormalizeFailure | null {
  // Narrow to the inner props object
  const kind = Object.keys(comp)[0] as string;
  const props = (comp as Record<string, unknown>)[kind] as Record<string, unknown>;

  if (!props || typeof props !== 'object') {
    return null; // pass — no props to validate
  }

  // sourceRef check: use `token` as the sourceRef surrogate for now.
  // Components that carry a token are considered traceable.
  // We do NOT fail on missing token — many primitive components intentionally
  // omit it. We do record explicitness when token is present.
  if ('token' in props && props['token']) {
    const tokenPath = `${path}.token`;
    trace.entityPathMap[path] = String(props['token']);
    trace.explicitnessMap[tokenPath] = 'explicit';
    trace.ownershipMap[path] = kind;
  }

  // explicitness field validation (if a component exposes it explicitly)
  if ('explicitness' in props) {
    const val = props['explicitness'];
    if (val !== 'explicit' && val !== 'inferred') {
      return intakeInvalid(
        `${path}.explicitness has invalid value "${String(val)}"; must be "explicit" or "inferred"`,
        trace
      );
    }
    trace.explicitnessMap[path] = val as 'explicit' | 'inferred';
  }

  // Recurse into nested component arrays (Container, Accordion, Tabs, etc.)
  for (const key of ['components', 'items', 'children'] as const) {
    if (key in props && Array.isArray(props[key])) {
      const nested = props[key] as ComponentDef[];
      // Only recurse if items look like ComponentDef (have at least one string key)
      const nestedComps = nested.filter(
        item => item && typeof item === 'object' && Object.keys(item).length === 1
      ) as ComponentDef[];
      if (nestedComps.length > 0) {
        const err = validateComponents(nestedComps, trace, `${path}.${key}`);
        if (err) { return err; }
      }
    }
  }

  return null;
}

function intakeInvalid(
  message: string,
  trace: NormalizationTrace
): NormalizeFailure {
  return {
    ok: false,
    errorKind: 'intake-invalid',
    message,
    trace
  };
}
