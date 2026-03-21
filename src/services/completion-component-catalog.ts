import { COMPONENT_DEFINITIONS } from '../components/definitions/component-definitions';
import type { CompletionValue, ComponentProperty } from '../components/definitions/types';

export type { CompletionValue, ComponentProperty };

/**
 * 補完カタログ（本モジュール）の正本は **COMPONENT_DEFINITIONS**（descriptor graph）。
 * `SchemaCompletionEngine` は `COMPONENT_DEFINITIONS` と `COMPONENT_PROPERTIES` を直接参照する。
 *
 * `COMPONENT_DESCRIPTIONS` は上記から導出した **互換用の Record**（例: `component-manifest-compatibility` テストや、
 * 説明文を `Record<string, string>` で受け取る呼び出し側）向け。SSOT は descriptor 側。
 */
export const COMPONENT_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  COMPONENT_DEFINITIONS.map(def => [def.name, def.description])
);

/**
 * コンポーネントごとのプロパティメタ（descriptor 由来）。値配列は呼び出し側の改変から隔離するため浅くコピーする。
 */
export const COMPONENT_PROPERTIES: Record<string, ComponentProperty[]> = Object.fromEntries(
  COMPONENT_DEFINITIONS.map(def => [
    def.name,
    def.properties.map(property => {
      if (property.values) {
        return {
          ...property,
          values: [...property.values]
        };
      }
      return {
        ...property
      };
    })
  ])
);
