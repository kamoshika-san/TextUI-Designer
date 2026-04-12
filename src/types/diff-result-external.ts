/**
 * Diff Result External Schema — 外部公開用の Diff 結果型定義
 * schemaVersion: 'diff-result-external/v1'
 *
 * Platform 戦略: Core Public API として外部から依存してよい型。
 * 内部の DiffIR / SemanticDiff は Review Engine の実装詳細として分離する。
 */

// ── 変更エントリ ──────────────────────────────────────────────────────────────

export interface ExternalChange {
  /** パイプライン内で変更を一意に識別する ID */
  changeId: string;
  /** 変更種別（AddComponent / UpdateProps 等） */
  type: string;
  /** 対象コンポーネント ID */
  componentId: string;
  /** 変更レイヤー（structure / behavior / visual / data） */
  layer: string;
  /** 影響度（low / medium / high） */
  impact: 'low' | 'medium' | 'high';
  /** 人間可読な説明 */
  humanReadable: {
    title: string;
    description: string;
  };
}

// ── Decision エントリ ─────────────────────────────────────────────────────────

export interface ExternalDecision {
  changeId: string;
  decision: 'accept' | 'reject' | 'defer' | 'ignore';
  rationale?: string;
  author: string;
  timestamp: number;
}

// ── DiffResultExternal ────────────────────────────────────────────────────────

/**
 * 外部公開に耐える Diff 結果スキーマ。
 * `textui review --format json` の出力形式。
 */
export interface DiffResultExternal {
  /** スキーマバージョン */
  schemaVersion: 'diff-result-external/v1';

  /** 比較メタデータ */
  metadata: {
    baseRef: string;
    headRef: string;
    filePath: string;
    comparedAt: string;
  };

  /** サマリー */
  summary: {
    added: number;
    removed: number;
    modified: number;
    moved: number;
    confidence: 'high' | 'medium' | 'low';
  };

  /** 変更一覧（machine-readable） */
  changes: ExternalChange[];

  /**
   * レビュー決定一覧（`--include-decisions` フラグ指定時のみ含まれる）
   * `.textui/decisions/<file>.json` から読み込む
   */
  decisions?: ExternalDecision[];
}
