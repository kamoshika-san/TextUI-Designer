/**
 * Semantic diff v2 — WebView パネル用 domain ツリー（camelCase）
 *
 * Wave 0 正本 `docs/future/semantic/webview-semantic-diff-v2-panel-spec.md` §3.2 の
 * **postMessage JSON 例**は snake_case（`screenId` は camel、`diff_event` 等は snake）。
 * **本ファイルの TS 形状は camelCase を正**とし、JSON との対応は下表を参照。
 *
 * | JSON (例) | TS (本ファイル) |
 * |-----------|-----------------|
 * | screenId | screenId |
 * | entityId | entityId |
 * | componentId | componentId |
 * | decision.diff_event | decision.diffEvent |
 * | decision.target_id | decision.targetId |
 * | decision.confidence_band | decision.confidenceBand |
 * | decision.ambiguity_reason | decision.ambiguityReason |
 * | decision.review_status | decision.reviewStatus |
 * | explanation.before_predicate | explanation.beforePredicate |
 * | explanation.after_predicate | explanation.afterPredicate |
 *
 * Runtime v2 収録型（`DiffCompareResultV2Payload`）は `src/core/diff/diff-v2-types.ts` の
 * **snake_case id フィールド**（`screen_id` 等）で保持される。変換は
 * `semantic-diff-v2-panel-mapper.ts` に集約する。
 */

import type { V2DiffEvent, V2ReviewStatus } from '../../core/diff/diff-v2-types';

/** postMessage `payload.meta` に相当（任意フィールド） */
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
  /** Runtime v2 がまだ `canonical_predicate` のみの場合の受け皿 */
  canonicalPredicate?: unknown;
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

export interface SemanticDiffV2ScreenView {
  screenId: string;
  diffs: SemanticDiffV2RecordView[];
  entities: SemanticDiffV2EntityView[];
}

/** Wave 0 §3.2 `payload` 木（camelCase） */
export interface SemanticDiffV2PanelPayload {
  screens: SemanticDiffV2ScreenView[];
  meta?: SemanticDiffV2PanelMeta;
}

/**
 * WebView 向け v2 表示モデル（`VisualDiffResult` と対になる概念物）
 *
 * postMessage 全体 `{ type, schemaVersion, payload }` のうち **payload 相当**を保持。
 */
export interface VisualDiffV2Result {
  payload: SemanticDiffV2PanelPayload;
  /** いずれかの `diffs[]` に 1 件以上ある */
  hasChanges: boolean;
}
