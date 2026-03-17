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
  /** 補完やカタログで表示する短い説明 */
  description: string;
  /** 補完用プロパティ定義 */
  properties: ComponentProperty[];
  /** token の既定適用先（任意） */
  tokenStyleProperty?: TokenStyleProperty;
}

