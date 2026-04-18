/**
 * Semantic v2 diff record TypeScript types
 * Source: docs/future/semantic/semantic-meaning-core-ontology-v0-ja.md
 * Target boundary: design artifact only — do NOT import from src/
 */

import type { EvidenceShape } from './evidence';
import type { CanonicalPredicate } from './canonical-predicate';

/** Closed vocabulary of 12 diff events (v0 recommended set) */
export type DiffEvent =
  // entity
  | 'entity_added'
  | 'entity_removed'
  | 'entity_renamed'
  | 'entity_state_changed'
  // transition
  | 'transition_added'
  | 'transition_removed'
  | 'transition_edge_changed'
  // component
  | 'component_added'
  | 'component_removed'
  | 'component_action_changed'
  | 'component_availability_changed'
  | 'component_guard_changed';

/** Human review verdict for a diff record */
export type ReviewStatus = 'approved' | 'rejected' | 'needs_review';

/** Decision payload — what happened and how certain we are */
export interface DecisionPayload {
  diff_event: DiffEvent;
  target_id: string;
  /** Certainty of the comparison conclusion (0.0–1.0) */
  confidence: number;
  /** Required when confidence is low; free text, short sentence */
  ambiguity_reason?: string;
  review_status?: ReviewStatus;
}

/** Explanation payload — evidence and predicates that support the decision */
export interface ExplanationPayload {
  evidence: EvidenceShape[];
  canonical_predicate?: CanonicalPredicate;
}

/** Semantic v2 diff record — decision and explanation are fully separated */
export interface V2DiffRecord {
  decision: DecisionPayload;
  explanation: ExplanationPayload;
}
