/**
 * Review Engine — Diff IR (Intermediate Representation)
 *
 * DiffIR は SemanticDiff を Review Engine パイプラインが処理できる形に拡張した型。
 * decisions / impacts / clusters は各エピック（E-RE1/RE2/RE3）が段階的に埋める optional フィールド。
 */

import type { SemanticChange, SemanticDiff, DiffSummary } from '../../types/semantic-diff';
import type { Decision } from './decision';
import type { Impact } from './impact-propagator';

// ── Change ────────────────────────────────────────────────────────────────────

/** Review Engine が各変更を識別するための一意 ID */
export type ChangeId = string;

/** DiffIR 内の個別変更エントリ。SemanticChange を changeId でラップする。 */
export interface Change {
  /** パイプライン内で変更を一意に識別する ID（例: "change-0", "change-1"） */
  changeId: ChangeId;
  /** 元の SemanticChange 型（AddComponent / UpdateProps 等） */
  type: SemanticChange['type'];
  /** 変更前の値（props / event 等。構造変更では undefined） */
  before?: unknown;
  /** 変更後の値 */
  after?: unknown;
  /** 元の SemanticChange 全体（下流ステージが参照できるよう保持） */
  semanticChange: SemanticChange;
  /** パイプライン各ステージが付与するメタデータ */
  metadata: ChangeMetadata;
}

/** パイプライン各ステージが段階的に付与するメタデータ */
export interface ChangeMetadata {
  /** E-RE3-S1: Change Classification が付与する分類 */
  classType?: 'layout' | 'style' | 'content' | 'behavior';
  /** E-RE2-S2: Impact マッピングが付与するノード ID */
  nodeId?: string;
  /** E-RE3-S3: Priority Scoring が付与する優先度スコア */
  priorityScore?: number;
}

// ── Cluster (E-RE3 が埋める) ──────────────────────────────────────────────────

/** 類似変更のグループ */
export interface Cluster {
  clusterId: string;
  /** クラスタの表示ラベル */
  label: string;
  /** このクラスタに含まれる changeId 一覧 */
  changeIds: ChangeId[];
  /** E-RE3-S3 が算出する優先度スコア */
  priorityScore?: number;
}

// ── DiffIR ────────────────────────────────────────────────────────────────────

/**
 * Review Engine パイプラインが処理する中間表現。
 * SemanticDiff を基盤とし、Decision / Impact / Cluster を optional で拡張する。
 */
export interface DiffIR {
  /** スキーマバージョン */
  kind: 'diff-ir/v1';
  /** 元の SemanticDiff サマリー */
  summary: DiffSummary;
  /** パイプラインが処理する変更一覧（changeId 付き） */
  changes: Change[];
  /** E-RE1 が付与する意思決定一覧 */
  decisions?: Decision[];
  /** E-RE2 が付与する影響分析一覧 */
  impacts?: Impact[];
  /** E-RE3 が付与する変更クラスタ一覧 */
  clusters?: Cluster[];
}
