/**
 * ConflictDetector — Epic I Slice 1 (T-I01)
 *
 * 2つの DSL 変更ストリーム（ours / theirs）を共通祖先（base）と照合し、
 * 同一インデックスで両側が変更している競合箇所を検出する。
 *
 * UI 表示・自動解決・Git 統合は対象外（Slice 2+）。
 */

import type { ComponentDef } from '../dsl-types';
import type { DiffResult } from '../../exporters/metrics/diff-manager';

export interface ConflictEntry {
  /** 競合しているコンポーネントの配列インデックス */
  index: number;
  /** 共通祖先のコンポーネント */
  base: ComponentDef;
  /** our 側の変更後コンポーネント */
  ours: ComponentDef;
  /** their 側の変更後コンポーネント */
  theirs: ComponentDef;
}

export interface ConflictResult {
  conflicts: ConflictEntry[];
  hasConflicts: boolean;
}

/**
 * 2つの DiffResult を照合し、同一インデックスで両側が変更している箇所を競合として返す。
 *
 * 競合定義: oursDiff と theirsDiff の modifiedComponents に同一インデックスが含まれる場合。
 *
 * @param base      共通祖先の components 配列
 * @param ours      our 側の変更後 components 配列
 * @param theirs    their 側の変更後 components 配列
 * @param oursDiff  base → ours の DiffResult
 * @param theirsDiff base → theirs の DiffResult
 */
export function detectConflicts(
  base: ComponentDef[],
  ours: ComponentDef[],
  theirs: ComponentDef[],
  oursDiff: DiffResult,
  theirsDiff: DiffResult,
): ConflictResult {
  const oursModified = new Set(oursDiff.modifiedComponents);
  const theirsModified = new Set(theirsDiff.modifiedComponents);

  const conflicts: ConflictEntry[] = [];

  for (const idx of oursModified) {
    if (theirsModified.has(idx)) {
      const baseComp = base[idx];
      const oursComp = ours[idx];
      const theirsComp = theirs[idx];
      if (baseComp && oursComp && theirsComp) {
        conflicts.push({ index: idx, base: baseComp, ours: oursComp, theirs: theirsComp });
      }
    }
  }

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
  };
}
