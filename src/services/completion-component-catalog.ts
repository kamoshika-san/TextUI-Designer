import { COMPONENT_DEFINITIONS } from '../components/definitions/component-definitions';
import type { CompletionValue, ComponentProperty } from '../components/definitions/types';

export type { CompletionValue, ComponentProperty };

/**
 * 補完 UI 用の説明文。descriptor graph（COMPONENT_DEFINITIONS）が単一ソース。
 */
export const COMPONENT_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  COMPONENT_DEFINITIONS.map(def => [def.name, def.description])
);

/**
 * コンポーネントごとのプロパティメタ。値配列は呼び出し側の改変から隔離するため浅くコピーする。
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
