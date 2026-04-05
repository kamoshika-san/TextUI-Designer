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
  /** 競合の種類 */
  conflictKind: 'both-modified' | 'both-added' | 'mixed';
}

export interface ConflictResult {
  conflicts: ConflictEntry[];
  hasConflicts: boolean;
}

/**
 * 2つの DiffResult を照合し、同一インデックスで両側が変更している箇所を競合として返す。
 *
 * 競合定義:
 *   1. both-modified — 同一インデックスを両側が modified
 *   2. both-added    — 同一インデックスを両側が added
 *   3. mixed         — 同一インデックスで一方が modified、他方が added
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
  const oursAdded = new Set(oursDiff.addedComponents);
  const theirsModified = new Set(theirsDiff.modifiedComponents);
  const theirsAdded = new Set(theirsDiff.addedComponents);

  // Union: すべての変更インデックス（modified ∪ added）
  const oursChanged = new Set([...oursModified, ...oursAdded]);
  const theirsChanged = new Set([...theirsModified, ...theirsAdded]);

  const conflicts: ConflictEntry[] = [];

  for (const idx of oursChanged) {
    if (!theirsChanged.has(idx)) continue;

    const oursComp = ours[idx];
    const theirsComp = theirs[idx];
    // both-added の場合 base[idx] は存在しないため undefined を許容
    const baseComp = base[idx] as ComponentDef | undefined;
    if (!oursComp || !theirsComp) continue;

    let conflictKind: ConflictEntry['conflictKind'];
    if (oursModified.has(idx) && theirsModified.has(idx)) {
      conflictKind = 'both-modified';
    } else if (oursAdded.has(idx) && theirsAdded.has(idx)) {
      conflictKind = 'both-added';
    } else {
      conflictKind = 'mixed';
    }

    conflicts.push({
      index: idx,
      base: (baseComp ?? oursComp) as ComponentDef,
      ours: oursComp,
      theirs: theirsComp,
      conflictKind,
    });
  }

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
  };
}
