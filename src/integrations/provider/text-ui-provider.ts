/**
 * TextUI Provider API — 外部 Provider が実装すべきインターフェース契約
 *
 * Platform 戦略: Core → Protocol → Surface の Protocol 層に位置する。
 * Provider は pure function として実装する（副作用なし）。
 * Provider は DSL を変更しない（read-only）。
 * Provider は capability を宣言し、Core がルーティングする。
 */

import type { TextUIDSL } from '../../domain/dsl-types';

// ── Capability ────────────────────────────────────────────────────────────────

export type ProviderCapability =
  | 'html-static'       // 静的 HTML 出力
  | 'react-component'   // React コンポーネント出力
  | 'vue-component'     // Vue コンポーネント出力
  | 'svelte-component'  // Svelte コンポーネント出力
  | 'preview-png'       // プレビュー画像出力
  | 'diff-json'         // Diff JSON 出力
  | 'review-summary';   // レビューサマリー出力

// ── 入出力型 ──────────────────────────────────────────────────────────────────

/**
 * Provider への入力。Core が正規化した DSL を渡す。
 * Provider は DSL を変更しない。
 */
export interface ProviderInput {
  /** 正規化済み DSL */
  dsl: TextUIDSL;
  /** エクスポートオプション（テーマパス・出力パス等） */
  options: ProviderExportOptions;
}

export interface ProviderExportOptions {
  themePath?: string;
  outputPath?: string;
  sourcePath?: string;
  extensionPath?: string;
  /** その他のプロバイダー固有オプション */
  [key: string]: unknown;
}

/**
 * Provider の出力成果物。
 */
export interface ExportArtifact {
  /** 成果物の内容（文字列または Buffer） */
  content: string | Buffer;
  /** MIME タイプ（例: "text/html", "application/json"） */
  mimeType: string;
  /** 推奨ファイル名（任意） */
  fileName?: string;
}

/**
 * Provider が返す診断情報。
 */
export interface ProviderDiagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  entityPath?: string;
}

// ── TextUIProvider インターフェース ───────────────────────────────────────────

/**
 * TextUI Provider の契約インターフェース。
 *
 * 実装ルール:
 * - `export()` は pure function（副作用なし）
 * - DSL を変更しない
 * - ファイル書き込みは Core が担う（Provider は content を返すだけ）
 */
export interface TextUIProvider {
  /** Provider 識別名（例: "html", "react-tailwind"） */
  readonly name: string;

  /** Provider が対応できる capability 一覧 */
  readonly capabilities: ProviderCapability[];

  /**
   * DSL を受け取り、成果物を返す。
   * 副作用なし。ファイル書き込みは Core が担う。
   */
  export(input: ProviderInput): Promise<ExportArtifact>;

  /**
   * Provider の診断情報を返す（任意実装）。
   * DSL に問題がある場合に警告・エラーを返す。
   */
  diagnose?(input: ProviderInput): ProviderDiagnostic[];
}
