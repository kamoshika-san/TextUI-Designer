/**
 * Review Engine — Review Set Builder
 * T-RE3-010 / T-RE3-011
 *
 * priority 上位 N 件の「レビュー必須リスト」を生成する。
 */

import type { Cluster } from './change-clusterer';

// ── ReviewSet 型 ──────────────────────────────────────────────────────────────

export interface ReviewSetItem {
  rank: number;
  cluster: Cluster;
  priorityScore: number;
}

export interface ReviewSet {
  topN: number;
  totalClusters: number;
  items: ReviewSetItem[];
}

// ── buildReviewSet ────────────────────────────────────────────────────────────

export interface BuildReviewSetOptions {
  /** 上位何件を抽出するか（デフォルト: 10） */
  topN?: number;
}

/**
 * scoreClusters 済みの Cluster 配列から上位 N 件の ReviewSet を生成する。
 * T-RE3-010
 *
 * - topN が 0 以下の場合は空の ReviewSet を返す
 * - clusters は priorityScore 降順でソート済みであることを前提とする
 */
export function buildReviewSet(
  clusters: Cluster[],
  options: BuildReviewSetOptions = {}
): ReviewSet {
  const topN = Math.max(0, options.topN ?? 10);
  const totalClusters = clusters.length;
  const top = clusters.slice(0, topN);

  const items: ReviewSetItem[] = top.map((cluster, i) => ({
    rank: i + 1,
    cluster,
    priorityScore: cluster.priorityScore ?? 0
  }));

  return { topN, totalClusters, items };
}

// ── フォーマット出力 ──────────────────────────────────────────────────────────

/**
 * ReviewSet を JSON 文字列として出力する。
 * T-RE3-011
 */
export function formatReviewSetJson(reviewSet: ReviewSet): string {
  return JSON.stringify(reviewSet, null, 2);
}

/**
 * ReviewSet を Markdown 文字列として出力する。
 * T-RE3-011
 *
 * 出力形式:
 * ## Review Set (top N / total M)
 * - [score] label (K changes)
 */
export function formatReviewSetMarkdown(reviewSet: ReviewSet): string {
  const lines: string[] = [
    `## Review Set (top ${reviewSet.items.length} / total ${reviewSet.totalClusters})`,
    ''
  ];

  if (reviewSet.items.length === 0) {
    lines.push('_No items to review._');
  } else {
    for (const item of reviewSet.items) {
      const score = item.priorityScore.toString().padStart(3, ' ');
      const changeCount = item.cluster.changeIds.length;
      const plural = changeCount === 1 ? 'change' : 'changes';
      lines.push(`- [${score}] ${item.cluster.label} (${changeCount} ${plural})`);
    }
  }

  return lines.join('\n') + '\n';
}
