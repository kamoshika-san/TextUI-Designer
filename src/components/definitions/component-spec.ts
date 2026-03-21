import type { BuiltInComponentName } from './built-in-components';
import type {
  ComponentDefinition,
  ComponentProperty,
  ExporterRendererMethod,
  SchemaRef,
  TokenStyleProperty
} from './types';

/**
 * ComponentSpec（E1-S1-T1 / T-176）: built-in コンポーネントの意味論メタを集約する **中間モデル**。
 * 既存の `COMPONENT_DEFINITIONS`（descriptor graph）と同じ情報を「1箇所に集める器」として表現する。
 *
 * **Migration seam（T-178 へ）**: 現状は `ComponentDefinition` から合成可能な形に留め、
 * `COMPONENT_DEFINITIONS` の一括置換・DEFINITIONS 合成は **T-178** で実施する。
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
    tokenStyleProperty: def.tokenStyleProperty
  };
}
