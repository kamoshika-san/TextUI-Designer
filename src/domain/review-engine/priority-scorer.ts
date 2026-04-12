/**
 * Review Engine — Priority Scorer
 * T-RE3-007 / T-RE3-008
 *
 * priority = impactScore × changeSeverity でレビュー優先度を算出する。
 *
 * changeSeverity の重み（classType 別）:
 * | classType | severity | 根拠                                    |
 * |-----------|----------|-----------------------------------------|
 * | behavior  | 1.0      | 遷移・条件・バインディング変更は最重要  |
 * | content   | 0.7      | テキスト・構造変更は中程度              |
 * | layout    | 0.5      | 配置変更は低〜中程度                    |
 * | style     | 0.3      | 見た目変更は最低優先                    |
 * | unknown   | 0.5      | 分類不明はデフォルト中程度              |
 */

import type { Cluster } from './change-clusterer';
import type { ClassType } from './change-classifier';

// ── changeSeverity ────────────────────────────────────────────────────────────

const SEVERITY_WEIGHT: Record<ClassType | 'unknown', number> = {
  behavior: 1.0,
  content:  0.7,
  layout:   0.5,
  style:    0.3,
  unknown:  0.5,
};

/**
 * classType から changeSeverity（0〜1）を返す。
 */
export function getChangeSeverity(classType: ClassType | undefined): number {
  return SEVERITY_WEIGHT[classType ?? 'unknown'];
}

// ── Priority Scoring ──────────────────────────────────────────────────────────

/**
 * Cluster の優先度スコアを算出する。
 * T-RE3-007
 *
 * priority = impactScore（0〜100）× changeSeverity（0〜1）
 * 結果は 0〜100 に丸める。
 *
 * @param cluster       対象 Cluster
 * @param impactScore   E-RE2-S4 が算出する Impact スコア（0〜100）。未提供時は 50。
 * @param classType     Cluster の代表 classType（clusterId から推定可能）
 */
export function calculatePriority(
  cluster: Cluster,
  impactScore: number = 50,
  classType?: ClassType
): number {
  // clusterId から classType を推定（"cluster:<id>:<classType>" 形式）
  const inferredClassType = classType ?? inferClassTypeFromClusterId(cluster.clusterId);
  const severity = getChangeSeverity(inferredClassType);
  const raw = impactScore * severity;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

/**
 * clusterId から classType を推定する。
 * "cluster:<id>:<classType>" 形式を前提とする。
 */
function inferClassTypeFromClusterId(clusterId: string): ClassType | undefined {
  const parts = clusterId.split(':');
  const last = parts[parts.length - 1];
  if (last === 'layout' || last === 'style' || last === 'content' || last === 'behavior') {
    return last as ClassType;
  }
  return undefined;
}

/**
 * Cluster 配列に priorityScore を付与して priority 降順にソートして返す。
 */
export function scoreClusters(
  clusters: Cluster[],
  impactScoreMap: Map<string, number> = new Map()
): Cluster[] {
  return clusters
    .map(cluster => ({
      ...cluster,
      priorityScore: calculatePriority(
        cluster,
        impactScoreMap.get(cluster.clusterId) ?? 50
      )
    }))
    .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
}
