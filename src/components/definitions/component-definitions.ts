import { BUILT_IN_COMPONENTS, type BuiltInComponentName } from './built-in-components';
import { builtInSchemaRef } from './component-spec';
import { CORE_CATALOG_METADATA } from './core-catalog-metadata';
import { COMPONENT_MANIFEST } from './manifest';
import type { ComponentDefinition } from './types';
import { BUILT_IN_EXPORTER_RENDERER_DEFINITIONS } from './exporter-renderer-definitions';

/**
 * 単一ソース化のための定義一覧。
 *
 * **schemaRef（T-177）**: manifest では保持せず `builtInSchemaRef(name)` で導出。
 * **ComponentSpec（T-176）**: 中間モデルは `component-spec.ts` を参照。
 */
export const COMPONENT_DEFINITIONS: readonly ComponentDefinition[] = BUILT_IN_COMPONENTS.map(
  (name: BuiltInComponentName) => {
    const entry = COMPONENT_MANIFEST[name];
    const exporter = BUILT_IN_EXPORTER_RENDERER_DEFINITIONS[name];
    const coreMeta = CORE_CATALOG_METADATA[name];
    return {
      name,
      schemaRef: builtInSchemaRef(name),
      description: entry.description,
      properties: entry.properties,
      // token 既定: 正本は exporter-renderer-definitions（→ token-style-property-map 経由で export / プレビューが参照）
      tokenStyleProperty: exporter.tokenStyleProperty,
      previewRendererKey: name,
      exporterRendererMethod: exporter.rendererMethod,
      catalogSummaryEn: coreMeta.catalogSummaryEn,
      requiredProps: coreMeta.requiredProps,
      optionalProps: coreMeta.optionalProps,
      supportsChildren: coreMeta.supportsChildren,
      example: coreMeta.example
    };
  }
);

