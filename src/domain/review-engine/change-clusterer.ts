/**
 * Review Engine — Change Clusterer
 * T-RE3-004 / T-RE3-005
 *
 * 類似変更をコンポーネント単位でグルーピングする。
 * 同一 componentId + classType の変更を 1 Cluster にまとめる。
 */

import type { Change, ChangeId } from './diff-ir';
import type { ClassType } from './change-classifier';

// ── Cluster 型 ────────────────────────────────────────────────────────────────

export interface Cluster {
  /** クラスタの一意 ID（componentId + classType から生成） */
  clusterId: string;
  /** 表示ラベル（例: "Button btn-submit [behavior]"） */
  label: string;
  /** このクラスタに含まれる changeId 一覧 */
  changeIds: ChangeId[];
  /** E-RE3-S3 が算出する優先度スコア（未算出時は undefined） */
  priorityScore?: number;
}

// ── クラスタリング ────────────────────────────────────────────────────────────

/**
 * クラスタ ID を生成する。
 * componentId と classType の組み合わせで一意にする。
 */
function makeClusterId(componentId: string, classType: ClassType | undefined): string {
  const safeClass = classType ?? 'unknown';
  // 特殊文字をアンダースコアに変換して安全な ID にする
  const safeId = componentId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `cluster:${safeId}:${safeClass}`;
}

/**
 * Change 配列を componentId + classType でグルーピングして Cluster 配列を返す。
 * T-RE3-004
 *
 * - metadata.classType が付与されていない Change は classType = undefined として扱う
 * - 同一 componentId でも classType が異なれば別 Cluster になる
 */
export function clusterChanges(changes: Change[]): Cluster[] {
  const clusterMap = new Map<string, Cluster>();

  for (const change of changes) {
    const componentId = change.semanticChange.componentId;
    const classType = change.metadata.classType;
    const clusterId = makeClusterId(componentId, classType);

    const existing = clusterMap.get(clusterId);
    if (existing) {
      existing.changeIds.push(change.changeId);
    } else {
      const classLabel = classType ? ` [${classType}]` : '';
      clusterMap.set(clusterId, {
        clusterId,
        label: `${componentId}${classLabel}`,
        changeIds: [change.changeId]
      });
    }
  }

  return Array.from(clusterMap.values());
}
