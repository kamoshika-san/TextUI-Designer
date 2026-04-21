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
