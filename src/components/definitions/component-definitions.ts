import {
  BUILT_IN_COMPONENTS,
  COMPONENT_MANIFEST,
  type BuiltInComponentName
} from '../../registry/component-manifest';
import type { ComponentDefinition, ComponentProperty } from './types';

/**
 * 単一ソース化のための定義一覧。
 *
 * NOTE: T-20260317-002（土台のみ）では既存実装への配線は行わないため、
 * まずは現行の `component-manifest` をソースとして安全に組み立てる。
 * 後続チケットで依存関係を逆転し、この definitions が真の単一ソースになる。
 */
export const COMPONENT_DEFINITIONS: readonly ComponentDefinition[] = BUILT_IN_COMPONENTS.map(
  (name: BuiltInComponentName) => {
    const entry = COMPONENT_MANIFEST[name];
    return {
      name,
      schemaRef: entry.schemaRef,
      description: entry.description,
      properties: entry.properties as ComponentProperty[]
    };
  }
);

