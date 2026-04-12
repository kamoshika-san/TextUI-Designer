/**
 * TextUI Rule Pack API — Rule インターフェース契約
 *
 * Platform 戦略: Core → Protocol → Surface の Protocol 層に位置する。
 * Rule は pure function として実装する（副作用なし、DSL 変更なし）。
 */

import type { TextUIDSL } from '../../domain/dsl-types';

// ── Finding 型 ────────────────────────────────────────────────────────────────

export type FindingSeverity = 'error' | 'warning' | 'info';

export type FindingTag =
  | 'a11y'           // アクセシビリティ
  | 'style'          // スタイル・デザイントークン
  | 'structure'      // 構造・レイアウト
  | 'behavior'       // インタラクション・遷移
  | 'breaking'       // 破壊的変更
  | 'semantic-diff'  // SemanticDiff との連携
  | 'policy';        // 組織ポリシー

export interface Finding {
  /** Rule 識別名（例: "a11y/button-label"） */
  ruleId: string;
  /** 重要度 */
  severity: FindingSeverity;
  /** 人間可読なメッセージ */
  message: string;
  /** 対象コンポーネントのパス（例: "/page/components/0"） */
  entityPath: string;
  /** 修正ヒント（任意） */
  fixHint?: string;
  /** machine-readable タグ（CI フィルタリング用） */
  tags: FindingTag[];
}

// ── RuleContext ───────────────────────────────────────────────────────────────

export interface RuleContext {
  /** DSL ファイルパス（任意） */
  filePath?: string;
  /** Rule 固有の設定（任意） */
  config?: Record<string, unknown>;
}

// ── TextUIRule インターフェース ────────────────────────────────────────────────

/**
 * TextUI Rule の契約インターフェース。
 *
 * 実装ルール:
 * - `check()` は pure function（副作用なし）
 * - DSL を変更しない（read-only）
 * - Finding を返すだけ。修正は行わない。
 */
export interface TextUIRule {
  /** Rule 識別名（例: "a11y/button-label"） */
  readonly id: string;
  /** Rule の説明 */
  readonly description: string;
  /** デフォルト severity */
  readonly defaultSeverity: FindingSeverity;

  /**
   * DSL を検査し、Finding 一覧を返す。
   * 副作用なし。DSL を変更しない。
   */
  check(dsl: TextUIDSL, context: RuleContext): Finding[];
}
