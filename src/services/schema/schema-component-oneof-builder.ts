import type { SchemaDefinition } from '../../types';
import { getComponentSchemaRefs } from '../../registry/component-manifest';

export type OneOfRef = { $ref: string };

/**
 * `schemas/schema.json` の `definitions.component.oneOf` を
 * descriptor graph（`COMPONENT_DEFINITIONS` の各 `schemaRef` 列）から生成するためのビルダー。
 * 参照列挙は `getComponentSchemaRefs()`（registry）経由で descriptor と一致する。
 */
export function buildExpectedComponentOneOf(): OneOfRef[] {
  return getComponentSchemaRefs().map($ref => ({ $ref }));
}

/**
 * `definitions.component.oneOf` を期待値で置換する（in-place）。
 * @returns 更新後 schema（同一参照）
 */
export function applyExpectedComponentOneOf(schema: SchemaDefinition): SchemaDefinition {
  if (!schema.definitions) {
    schema.definitions = {};
  }

  const defs = schema.definitions as Record<string, unknown>;
  if (!defs.component || typeof defs.component !== 'object') {
    defs.component = {};
  }

  const componentDef = defs.component as Record<string, unknown>;
  componentDef.oneOf = buildExpectedComponentOneOf();

  return schema;
}

