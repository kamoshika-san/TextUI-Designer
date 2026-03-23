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
 * テーマ token を inline style に適用する際の CSS プロパティ名（kebab-case）。
 * 例: `color`, `border-color`, `background-color`
 *
 * 値の正本は `exporter-renderer-definitions.ts` の `BUILT_IN_EXPORTER_RENDERER_DEFINITIONS`。
 * `component-definitions.ts` で `COMPONENT_DEFINITIONS` に合成され、
 * `token-style-property-map.ts` の `getTokenStylePropertyKebab` が参照用 Map を構築する（export の `BaseComponentRenderer` と WebView の `token-inline-style-from-definition.ts` が利用）。
 */
export type TokenStyleProperty = string;
export type TokenSlotId = string;

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
  /**
   * テーマ token の既定適用先（CSS プロパティ名）。
   * 組み込みは `BUILT_IN_EXPORTER_RENDERER_DEFINITIONS[name].tokenStyleProperty` を `component-definitions` で詰めた値。
   */
  tokenStyleProperty?: TokenStyleProperty;
  /**
   * テーマ token の既定適用先（スロット ID）。命名は `docs/token-slot-naming-convention.md` を参照。
   * 未指定時は `tokenStyleProperty` のみで従来互換（ADR 0006）。
   */
  defaultTokenSlot?: string;
  tokenSlots?: TokenSlotId[];
  /**
   * WebView の組み込み renderer 登録キー（`component-map` の built-in キーと対応）。
   * 現状は `name` と同一。
   *
   * 型方針（T-20260321-027）: alias や組み込み外キーが実際に必要になるまで `BuiltInComponentName` 固定（YAGNI）。
   * 必要になった時点で `string` 拡張などを検討する。T-20260321-021（Step5）で descriptor 起点の登録に寄せ済み。
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
