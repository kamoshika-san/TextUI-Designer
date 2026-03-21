import { BUILT_IN_COMPONENTS, type BuiltInComponentName } from './built-in-components';
import { CORE_CATALOG_METADATA } from './core-catalog-metadata';
import { COMPONENT_MANIFEST } from './manifest';
import type { ComponentDefinition } from './types';
import { BUILT_IN_EXPORTER_RENDERER_DEFINITIONS } from './exporter-renderer-definitions';

/**
 * 単一ソース化のための定義一覧。
 *
 * NOTE: T-20260317-002（土台のみ）では既存実装への配線は行わないため、
 * まずは現行の `component-manifest` をソースとして安全に組み立てていた。
 *
 * T-20260317-003 以降は definitions 側が真の単一ソースとなるため、
 * ここでは registry ではなく definitions 内の manifest を参照する。
 */
export const COMPONENT_DEFINITIONS: readonly ComponentDefinition[] = BUILT_IN_COMPONENTS.map(
  (name: BuiltInComponentName) => {
    const entry = COMPONENT_MANIFEST[name];
    const exporter = BUILT_IN_EXPORTER_RENDERER_DEFINITIONS[name];
    const coreMeta = CORE_CATALOG_METADATA[name];
    return {
      name,
      schemaRef: entry.schemaRef,
      description: entry.description,
      properties: entry.properties,
      // token を inline style に反映する際の既定 CSS プロパティ名
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

