/**
 * 互換レイヤ: 既存 import を壊さないための re-export
 *
 * NOTE: コンポーネントのメタ情報（name/description/properties/schemaRef）の単一ソースは
 * `src/components/definitions/` 側へ移動した。
 */
import { BUILT_IN_COMPONENTS, type BuiltInComponentName } from '../components/definitions/built-in-components';
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

export function getComponentSchemaRefs(): string[] {
  return BUILT_IN_COMPONENTS.map((componentName) => COMPONENT_MANIFEST[componentName].schemaRef);
}
