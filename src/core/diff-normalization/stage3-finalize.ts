/**
 * Stage3: Finalize.
 *
 * Final pass before the normalized DSL is handed to the diff engine.
 * Stage3 always runs (not controlled by allowedRules) and performs:
 *   - Completeness check on trace maps: ensures every component in the DSL
 *     has at least an ownershipMap entry so downstream consumers never see
 *     undefined ownership.
 *   - Appends 'stage3-finalize' to trace.appliedRules.
 *
 * Stage3 does NOT mutate the DSL — it only completes the trace.
 */

import type { TextUIDSL } from '../../domain/dsl-types';
import type { ComponentDef } from '../../domain/dsl-types/component-def';
import type { NormalizationTrace } from './types';

const STAGE_RULE = 'stage3-finalize';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface Stage3Result {
  dsl: TextUIDSL;
  trace: NormalizationTrace;
}

/**
 * Run Stage3 finalization.
 *
 * @param dsl    DSL from Stage2 (not mutated).
 * @param trace  Trace from Stage2 (will be cloned and extended).
 * @returns A new Stage3Result with the finalized trace.
 */
export function runStage3Finalize(
  dsl: TextUIDSL,
  trace: NormalizationTrace
): Stage3Result {
  // Clone trace so Stage0–Stage2 data is preserved
  const outTrace: NormalizationTrace = {
    entityPathMap: { ...trace.entityPathMap },
    explicitnessMap: { ...trace.explicitnessMap },
    ownershipMap: { ...trace.ownershipMap },
    appliedRules: [...trace.appliedRules],
    warnings: [...trace.warnings]
  };

  // Ensure trace completeness: fill in ownership entries for any component
  // path that reached Stage3 without an explicit ownershipMap entry.
  fillOwnershipGaps(dsl.page?.components ?? [], outTrace, 'page.components');

  // Mark stage as applied
  outTrace.appliedRules.push(STAGE_RULE);

  return { dsl, trace: outTrace };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Walk the component tree and ensure every path has an ownershipMap entry.
 * Uses 'stage3-finalize' as the fallback ownership scope for any gap.
 */
function fillOwnershipGaps(
  components: ComponentDef[],
  trace: NormalizationTrace,
  pathPrefix: string
): void {
  for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    const path = `${pathPrefix}[${i}]`;

    if (!(path in trace.ownershipMap)) {
      trace.ownershipMap[path] = STAGE_RULE;
    }

    // Recurse into nested component arrays
    const kind = Object.keys(comp)[0] as string;
    const props = (comp as Record<string, unknown>)[kind] as Record<string, unknown> | undefined;
    if (props && typeof props === 'object') {
      for (const key of ['components', 'items', 'children'] as const) {
        if (key in props && Array.isArray(props[key])) {
          const nested = props[key] as ComponentDef[];
          fillOwnershipGaps(nested, trace, `${path}.${key}`);
        }
      }
    }
  }
}
