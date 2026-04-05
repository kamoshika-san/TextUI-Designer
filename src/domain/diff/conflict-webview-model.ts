/**
 * 競合表示モデル — Epic I Slice 3 (T-I04)
 *
 * ConflictResult を WebView 表示に変換するための型定義。
 * React 統合・postMessage 配信は Slice 4 で行う。
 */

export type ConflictKind = 'both-modified' | 'both-added' | 'mixed';

export interface ConflictViewEntry {
  /** 競合しているコンポーネントの配列インデックス */
  index: number;
  /** 競合の種類 */
  conflictKind: ConflictKind;
  /** our 側のコンポーネント種別ラベル（例: "Button"） */
  oursLabel: string;
  /** their 側のコンポーネント種別ラベル（例: "Text"） */
  theirsLabel: string;
}

export interface ConflictViewResult {
  entries: ConflictViewEntry[];
  hasConflicts: boolean;
}
