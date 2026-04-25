/**
 * Compare-logic v0: closed `V2DiffEvent` → compare layer (design F / G).
 */

import type { V2DiffEvent } from './diff-v2-types';

/** Three-layer model used in design F (evidence policy) and design G (sort order). */
export type CompareLogicLayer = 'structure' | 'surface' | 'semantic';

/**
 * Single source of truth for which layer each diff_event belongs to.
 * Must stay aligned with `docs/future/semantic/v2-compare-logic-f-evidence-generation.md` §F-1.
 */
export const DIFF_EVENT_LAYER: Readonly<Record<V2DiffEvent, CompareLogicLayer>> = {
  entity_added: 'structure',
  entity_removed: 'structure',
  entity_renamed: 'surface',
  entity_state_changed: 'semantic',
  transition_added: 'structure',
  transition_removed: 'structure',
  transition_edge_changed: 'semantic',
  component_added: 'structure',
  component_removed: 'structure',
  component_action_changed: 'semantic',
  component_availability_changed: 'semantic',
  component_guard_changed: 'semantic',
} as const;

export function diffEventLayer(event: V2DiffEvent): CompareLogicLayer {
  return DIFF_EVENT_LAYER[event];
}

/**
 * Stable full order for sorting V2DiffRecord arrays (Design G-2).
 * structure → surface → semantic; ties within a layer use this fixed position.
 */
export const DIFF_EVENT_FULL_ORDER: Readonly<Record<V2DiffEvent, number>> = {
  entity_added: 0,
  entity_removed: 1,
  transition_added: 2,
  transition_removed: 3,
  component_added: 4,
  component_removed: 5,
  entity_renamed: 6,
  entity_state_changed: 7,
  transition_edge_changed: 8,
  component_action_changed: 9,
  component_availability_changed: 10,
  component_guard_changed: 11,
} as const;

/**
 * Sort a diffs[] array in-place per Design G-2 full order.
 * Returns a new array; does not mutate the input.
 */
export function sortV2DiffRecords<T extends { decision: { diff_event: V2DiffEvent } }>(
  records: T[]
): T[] {
  return [...records].sort(
    (a, b) => DIFF_EVENT_FULL_ORDER[a.decision.diff_event] - DIFF_EVENT_FULL_ORDER[b.decision.diff_event]
  );
}
