import type { BuiltInComponentName } from './built-in-components';

export type CompletionValue = {
  value: string;
  description: string;
};

export type ComponentProperty = {
  name: string;
  description: string;
  values?: CompletionValue[];
};

/**
 * `schemas/schema.json` の definitions を参照するための参照文字列。
 * 例: `#/definitions/Text`
 */
export type SchemaRef = `#/definitions/${string}`;

/**
 * token を inline style に適用する際の既定プロパティ名。
 * 例: `color`, `border-color`, `background-color`
 *
 * NOTE: 現状の既定マップは `src/exporters/base-component-renderer.ts` 側にあるため、
 * この値の運用は後続チケット（T-20260317-005）で集約する。
 */
export type TokenStyleProperty = string;

/**
 * BaseComponentRenderer が dispatch する renderXxx メソッド名。
 * descriptor graph と exporter 定義の循環依存を避けるため `types` に置く。
 */
export type ExporterRendererMethod =
  | 'renderText'
  | 'renderInput'
  | 'renderButton'
  | 'renderCheckbox'
  | 'renderRadio'
  | 'renderSelect'
  | 'renderDatePicker'
  | 'renderDivider'
  | 'renderSpacer'
  | 'renderAlert'
  | 'renderContainer'
  | 'renderForm'
  | 'renderAccordion'
  | 'renderTabs'
  | 'renderTreeView'
  | 'renderTable'
  | 'renderLink'
  | 'renderBreadcrumb'
  | 'renderBadge'
  | 'renderProgress'
  | 'renderImage'
  | 'renderIcon';

/**
 * コンポーネント定義（単一ソース化の土台）
 *
 * NOTE: T-20260317-002 では「定義モデル+一覧」を作るだけで、
 * 既存の manifest / schema / WebView / Exporter への接続は行わない。
 */
export interface ComponentDefinition {
  /** DSL のタグ名（例: Text, Button） */
  name: string;
  /** スキーマ参照（例: `#/definitions/Text`） */
  schemaRef: SchemaRef;
  /** 補完やカタログで表示する短い説明（日本語。manifest 由来） */
  description: string;
  /**
   * MCP / `listComponents` 向けの英語一行説明（旧 core component-catalog）。
   * `description`（日本語）とは別物。
   */
  catalogSummaryEn: string;
  /** 補完用プロパティ定義 */
  properties: ComponentProperty[];
  /** token の既定適用先（任意） */
  tokenStyleProperty?: TokenStyleProperty;
  /**
   * WebView の組み込み renderer 登録キー（`component-map` の built-in キーと対応）。
   * 現状は `name` と同一。
   */
  previewRendererKey: BuiltInComponentName;
  /** Exporter 側が呼び分ける render メソッド名 */
  exporterRendererMethod: ExporterRendererMethod;
  /**
   * 子コンポーネントを持てるか。値は Step3（core catalog を descriptor に寄せる）で埋める。
   */
  supportsChildren?: boolean;
  /**
   * 必須 / 任意プロパティ名。値は Step3 で descriptor に寄せる。
   */
  requiredProps?: string[];
  optionalProps?: string[];
  /**
   * ドキュメント・サンプル用の例。値は Step3 で core から移行予定。
   */
  example?: Record<string, unknown>;
}
