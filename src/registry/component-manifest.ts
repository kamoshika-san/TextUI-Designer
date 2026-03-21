/**
 * 互換レイヤ: 既存 import を壊さないための re-export
 *
 * NOTE: コンポーネントのメタ情報（name/description/properties/schemaRef）の単一ソースは
 * `src/components/definitions/` 側へ移動した。
 */
import { BUILT_IN_COMPONENTS, type BuiltInComponentName } from '../components/definitions/built-in-components';
import { COMPONENT_DEFINITIONS } from '../components/definitions/component-definitions';
import {
  COMPONENT_MANIFEST,
  type ComponentManifestEntry,
  type ComponentProperty,
  type CompletionValue
} from '../components/definitions/manifest';

export { BUILT_IN_COMPONENTS, type BuiltInComponentName };
export { COMPONENT_MANIFEST, type ComponentManifestEntry, type ComponentProperty, type CompletionValue };

export function isBuiltInComponentName(name: string): name is BuiltInComponentName {
  return (BUILT_IN_COMPONENTS as readonly string[]).includes(name);
}

/** `COMPONENT_DEFINITIONS`（descriptor graph）の `schemaRef` 列。schema の `component.oneOf` 期待値に使う。 */
export function getComponentSchemaRefs(): string[] {
  return COMPONENT_DEFINITIONS.map(def => def.schemaRef);
}
