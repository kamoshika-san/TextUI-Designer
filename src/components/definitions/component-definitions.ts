import { BUILT_IN_COMPONENTS, type BuiltInComponentName } from './built-in-components';
import {
  buildComponentDefinitionFromSpec,
  builtInSchemaRef,
  type ComponentSpec
} from './component-spec';
import { CORE_CATALOG_METADATA } from './core-catalog-metadata';
import { COMPONENT_MANIFEST } from './manifest';
import type { ComponentDefinition } from './types';
import { BUILT_IN_EXPORTER_RENDERER_DEFINITIONS } from './exporter-renderer-definitions';

/** manifest の description/properties を ComponentSpec に載せ、descriptor へ単一経路で合成する（T-185）。 */
function buildBuiltInComponentSpec(name: BuiltInComponentName): ComponentSpec {
  const entry = COMPONENT_MANIFEST[name];
  const exporter = BUILT_IN_EXPORTER_RENDERER_DEFINITIONS[name];
  return {
    kind: name,
    schemaRef: builtInSchemaRef(name),
    description: entry.description,
    properties: entry.properties,
    previewRendererKey: name,
    exporterRendererMethod: exporter.rendererMethod,
    tokenStyleProperty: exporter.tokenStyleProperty,
    defaultTokenSlot: exporter.defaultTokenSlot,
    tokenSlots: exporter.tokenSlots
  };
}

/**
 * 組み込みコンポーネントの **意味論メタの正本（順序付き配列）**。
 * `COMPONENT_DEFINITIONS` は本配列から {@link buildComponentDefinitionFromSpec} で導出する（T-178）。
 */
export const BUILT_IN_COMPONENT_SPECS: readonly ComponentSpec[] = BUILT_IN_COMPONENTS.map(
  buildBuiltInComponentSpec
);

/**
 * 単一ソース化のための定義一覧。
 *
 * **schemaRef（T-177）**: manifest では保持せず `builtInSchemaRef(name)` で導出。
 * **ComponentSpec（T-176/T-178）**: 正本は {@link BUILT_IN_COMPONENT_SPECS}。
 */
export const COMPONENT_DEFINITIONS: readonly ComponentDefinition[] = BUILT_IN_COMPONENT_SPECS.map(
  spec => buildComponentDefinitionFromSpec(spec, CORE_CATALOG_METADATA[spec.kind])
);
