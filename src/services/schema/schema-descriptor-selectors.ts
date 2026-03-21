import { componentDescriptorRegistry } from '../../registry/component-descriptor-registry';

/**
 * Schema パイプライン用の descriptor graph 直結セレクタ。
 * 新規コードは `registry/component-manifest` ではなく本モジュールを参照すること。
 */

/** `COMPONENT_DEFINITIONS` の `schemaRef` 列（`schemas/schema.json` の `definitions.component.oneOf` と揃える基準）。 */
export function getComponentSchemaRefs(): string[] {
  return componentDescriptorRegistry.getSchemaRefs();
}

/** `definitions` に各コンポーネント定義が存在するか検証するときの名前列（descriptor 順）。 */
export function getComponentDefinitionNames(): string[] {
  return componentDescriptorRegistry.list().map(def => def.name);
}
