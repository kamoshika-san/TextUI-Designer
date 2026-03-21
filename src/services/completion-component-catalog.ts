import { componentDescriptorRegistry } from '../registry/component-descriptor-registry';
import type { CompletionValue, ComponentProperty } from '../components/definitions/types';

export type { CompletionValue, ComponentProperty };

/**
 * 補完カタログの **参照窓口**は {@link componentDescriptorRegistry}（component contract の集約点）。
 * 定義配列そのものへの直接 import はレジストリに寄せ、変更点を 1 経路に収束させる（T-109）。
 *
 * `COMPONENT_DESCRIPTIONS` は descriptor から導出した **互換用の Record**（例: `component-manifest-compatibility` テストや、
 * 説明文を `Record<string, string>` で受け取る呼び出し側）向け。
 */
export const COMPONENT_DESCRIPTIONS: Record<string, string> = Object.fromEntries(
  componentDescriptorRegistry.list().map(def => [def.name, def.description])
);

/**
 * コンポーネントごとのプロパティメタ（descriptor 由来）。値配列は呼び出し側の改変から隔離するため浅くコピーする。
 */
export const COMPONENT_PROPERTIES: Record<string, ComponentProperty[]> = Object.fromEntries(
  componentDescriptorRegistry.list().map(def => [
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
