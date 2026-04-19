/**
 * Semantic v2 diff record TypeScript types
 * Code-facing source of truth for the current compare-logic v2 record shape.
 * Target boundary: design artifact only — do NOT import from src/
 */

import type { EvidenceShape } from './evidence';
import type { CanonicalPredicate } from './canonical-predicate';

/**
 * Closed vocabulary of 12 diff events (v0 recommended set).
 * UI component **label** text changes are out of scope for compare-logic v2 (surface copy only; no `component_label_changed` event).
 */
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

/**
 * Discriminant for `DecisionPayload` (design E / P3-6).
 * `low` forces `ambiguity_reason` and `review_status` at the type level (authoring boundary: confidence below 0.8).
 * Call sites must set `confidence_band` consistently with numeric `confidence`; TypeScript does not correlate the two automatically.
 */
export type DecisionConfidenceBand = 'high' | 'low';

/** High-band decision — `ambiguity_reason` / `review_status` remain optional (typical: confidence ≥ 0.8). */
export interface HighConfidenceDecision {
  confidence_band: 'high';
  diff_event: DiffEvent;
  target_id: string;
  /** Certainty of the comparison conclusion (0.0–1.0) */
  confidence: number;
  ambiguity_reason?: string;
  review_status?: ReviewStatus;
}

/** Low-band decision — `ambiguity_reason` and `review_status` are required (authoring boundary: confidence below 0.8). */
export interface LowConfidenceDecision {
  confidence_band: 'low';
  diff_event: DiffEvent;
  target_id: string;
  /** Certainty of the comparison conclusion (0.0–1.0); authoring boundary pairs with `confidence_band: 'low'` */
  confidence: number;
  /** Required for low band; free text, short sentence */
  ambiguity_reason: string;
  review_status: ReviewStatus;
}

/** Decision payload — discriminated union on `confidence_band` */
export type DecisionPayload = HighConfidenceDecision | LowConfidenceDecision;

/** Explanation payload — evidence and predicates that support the decision */
export interface ExplanationPayload {
  /** Empty array is valid when no registered evidence_shape applies. */
  evidence: EvidenceShape[];
  /** Predicate describing the state before the change. Optional; omit when no structural diff applies. */
  before_predicate?: CanonicalPredicate;
  /** Predicate describing the state after the change. Optional; omit when no structural diff applies. */
  after_predicate?: CanonicalPredicate;
}

/** Semantic v2 diff record — decision and explanation are fully separated */
export interface V2DiffRecord {
  decision: DecisionPayload;
  explanation: ExplanationPayload;
}
