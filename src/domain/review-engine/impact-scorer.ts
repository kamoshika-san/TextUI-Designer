/**
 * Review Engine — Impact Scorer
 * T-RE2-010
 *
 * Impact 型から 0〜100 の重要度スコアを算出する。
 *
 * スコア算出式:
 *   raw = direct.length × 10 + indirect.length × 3 + navigation.length × 20
 *   score = min(100, raw)
 *
 * 根拠:
 * - navigation エッジ（画面遷移）は最も影響が大きい（×20）
 * - direct 隣接ノードは中程度（×10）
 * - indirect ノードは遠いほど影響が薄い（×3）
 */

import type { Impact } from './impact-propagator';

export interface ImpactScoreWeights {
  direct?: number;
  indirect?: number;
  navigation?: number;
}

const DEFAULT_WEIGHTS: Required<ImpactScoreWeights> = {
  direct:     10,
  indirect:    3,
  navigation: 20,
};

/**
 * Impact から 0〜100 の重要度スコアを算出する。
 * T-RE2-010
 */
export function calculateImpactScore(
  impact: Impact,
  weights: ImpactScoreWeights = {}
): number {
  const w = { ...DEFAULT_WEIGHTS, ...weights };
  const raw =
    impact.direct.length     * w.direct +
    impact.indirect.length   * w.indirect +
    impact.navigation.length * w.navigation;
  return Math.min(100, Math.max(0, raw));
}

/**
 * Impact 配列を一括スコア算出して Map<changeId, score> を返す。
 */
export function buildImpactScoreMap(
  impacts: Impact[],
  weights?: ImpactScoreWeights
): Map<string, number> {
  const map = new Map<string, number>();
  for (const impact of impacts) {
    map.set(impact.changeId, calculateImpactScore(impact, weights));
  }
  return map;
}
