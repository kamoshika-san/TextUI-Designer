/**
 * Runtime-facing semantic v2 payload types stored under DiffCompareResult.v2.
 *
 * These are intentionally scoped to the internal diff boundary so a future
 * V2SemanticDiffProvider can attach v2 records without expanding the provider
 * interface or importing design-only docs artifacts.
 */

export type V2DiffEvent =
  | 'entity_added'
  | 'entity_removed'
  | 'entity_renamed'
  | 'entity_state_changed'
  | 'transition_added'
  | 'transition_removed'
  | 'transition_edge_changed'
  | 'component_added'
  | 'component_removed'
  | 'component_action_changed'
  | 'component_availability_changed'
  | 'component_guard_changed';

export type V2ReviewStatus = 'approved' | 'rejected' | 'needs_review';
export type V2DecisionConfidenceBand = 'high' | 'low';

export interface V2HighConfidenceDecision {
  confidence_band: 'high';
  diff_event: V2DiffEvent;
  target_id: string;
  confidence: number;
  ambiguity_reason?: string;
  review_status?: V2ReviewStatus;
}

export interface V2LowConfidenceDecision {
  confidence_band: 'low';
  diff_event: V2DiffEvent;
  target_id: string;
  confidence: number;
  ambiguity_reason: string;
  review_status: V2ReviewStatus;
}

export type V2DiffDecision = V2HighConfidenceDecision | V2LowConfidenceDecision;

/** v2 explanation payload is kept permissive because evidence/predicate runtime types are not wired into src/ yet. */
export interface V2DiffExplanation {
  evidence: unknown[];
  before_predicate?: unknown;
  after_predicate?: unknown;
}

export interface V2DiffRecord {
  decision: V2DiffDecision;
  explanation: V2DiffExplanation;
}

export interface V2ComponentDiff {
  component_id: string;
  diffs: V2DiffRecord[];
}

export interface V2EntityDiff {
  entity_id: string;
  diffs: V2DiffRecord[];
  components: V2ComponentDiff[];
}

export interface V2ScreenDiffInScope {
  screen_id: string;
  diffs: V2DiffRecord[];
  entities: V2EntityDiff[];
}

export interface V2ScreenDiffOutOfScope {
  screen_id: string;
  outOfScope: true;
}

export type V2ScreenDiff = V2ScreenDiffInScope | V2ScreenDiffOutOfScope;

export interface DiffCompareResultV2Payload {
  screens: V2ScreenDiff[];
  metadata: {
    schemaVersion: 'v2-compare-logic/v0';
    totalRecords: number;
  };
}

export const AMBIGUITY_THRESHOLD = 0.8 as const;
