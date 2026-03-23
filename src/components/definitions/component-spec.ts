import type { BuiltInComponentName } from './built-in-components';
import type { CoreCatalogMeta } from './core-catalog-metadata';
import type {
  ComponentDefinition,
  ComponentProperty,
  ExporterRendererMethod,
  SchemaRef,
  TokenSlotId,
  TokenStyleProperty
} from './types';

/**
 * ComponentSpec（E1-S1-T1 / T-176）: built-in コンポーネントの意味論メタを集約する **中間モデル**。
 * 既存の `COMPONENT_DEFINITIONS`（descriptor graph）と同じ情報を「1箇所に集める器」として表現する。
 *
 * **T-178**: `COMPONENT_DEFINITIONS` は `BUILT_IN_COMPONENT_SPECS` から
 * {@link buildComponentDefinitionFromSpec} で生成する（descriptor の単一経路）。
 */
export interface ComponentSpec {
  /** DSL kind（built-in 名の正本は `BUILT_IN_COMPONENTS`） */
  kind: BuiltInComponentName;
  schemaRef: SchemaRef;
  description: string;
  properties: ComponentProperty[];
  previewRendererKey: BuiltInComponentName;
  exporterRendererMethod: ExporterRendererMethod;
  /**
   * テーマ token の既定適用先（CSS プロパティ名）。
   * `defaultTokenSlot` との併用は移行期間のみ（T-178 で単一化）。
   */
  tokenStyleProperty?: TokenStyleProperty;
  /** 暫定: multi-slot 拡張のためのスロット名（未使用なら省略） */
  defaultTokenSlot?: string;
  tokenSlots?: TokenSlotId[];
}

/**
 * built-in 既定: `schemas/schema.json` の `definitions.<Name>` への参照。
 * **schemaRef の単一ソース**（T-177）: manifest からは除去し、ここで導出する。
 */
export function builtInSchemaRef(name: BuiltInComponentName): SchemaRef {
  return `#/definitions/${name}` as SchemaRef;
}

export function buildComponentSpecFromDefinition(def: ComponentDefinition): ComponentSpec {
  return {
    kind: def.name as BuiltInComponentName,
    schemaRef: def.schemaRef,
    description: def.description,
    properties: def.properties,
    previewRendererKey: def.previewRendererKey,
    exporterRendererMethod: def.exporterRendererMethod,
    tokenStyleProperty: def.tokenStyleProperty,
    defaultTokenSlot: def.defaultTokenSlot,
    tokenSlots: def.tokenSlots
  };
}

/**
 * `ComponentSpec` + core catalog 行を {@link ComponentDefinition}（descriptor 行）へ合成する。
 * **T-178**: `COMPONENT_DEFINITIONS` の正の生成経路。
 */
export function buildComponentDefinitionFromSpec(
  spec: ComponentSpec,
  coreMeta: CoreCatalogMeta
): ComponentDefinition {
  return {
    name: spec.kind,
    schemaRef: spec.schemaRef,
    description: spec.description,
    properties: spec.properties,
    tokenStyleProperty: spec.tokenStyleProperty,
    defaultTokenSlot: spec.defaultTokenSlot,
    tokenSlots: spec.tokenSlots,
    previewRendererKey: spec.previewRendererKey,
    exporterRendererMethod: spec.exporterRendererMethod,
    catalogSummaryEn: coreMeta.catalogSummaryEn,
    requiredProps: coreMeta.requiredProps,
    optionalProps: coreMeta.optionalProps,
    supportsChildren: coreMeta.supportsChildren,
    example: coreMeta.example
  };
}
