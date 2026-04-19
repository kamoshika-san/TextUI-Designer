/**
 * Semantic diff v2 panel domain types (camelCase for WebView-facing use).
 */

import type { V2DiffEvent, V2ReviewStatus } from '../../core/diff/diff-v2-types';

export interface SemanticDiffV2PanelMeta {
  compareRunId?: string;
}

export interface SemanticDiffV2DecisionView {
  confidenceBand?: 'high' | 'low';
  diffEvent: V2DiffEvent;
  targetId: string;
  confidence: number;
  ambiguityReason?: string;
  reviewStatus?: V2ReviewStatus;
}

export interface SemanticDiffV2ExplanationView {
  evidence: unknown[];
  beforePredicate?: unknown;
  afterPredicate?: unknown;
}

export interface SemanticDiffV2RecordView {
  decision: SemanticDiffV2DecisionView;
  explanation: SemanticDiffV2ExplanationView;
}

export interface SemanticDiffV2ComponentView {
  componentId: string;
  diffs: SemanticDiffV2RecordView[];
}

export interface SemanticDiffV2EntityView {
  entityId: string;
  diffs: SemanticDiffV2RecordView[];
  components: SemanticDiffV2ComponentView[];
}

export interface SemanticDiffV2ScreenInScopeView {
  screenId: string;
  diffs: SemanticDiffV2RecordView[];
  entities: SemanticDiffV2EntityView[];
}

export interface SemanticDiffV2ScreenOutOfScopeView {
  screenId: string;
  outOfScope: true;
}

export type SemanticDiffV2ScreenView = SemanticDiffV2ScreenInScopeView | SemanticDiffV2ScreenOutOfScopeView;

export interface SemanticDiffV2PanelPayload {
  screens: SemanticDiffV2ScreenView[];
  meta?: SemanticDiffV2PanelMeta;
}

export interface VisualDiffV2Result {
  payload: SemanticDiffV2PanelPayload;
  hasChanges: boolean;
}
