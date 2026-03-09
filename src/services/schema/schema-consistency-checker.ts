import { BUILT_IN_COMPONENTS, getComponentSchemaRefs } from '../../registry/component-manifest';
import type { SchemaDefinition } from '../../types';

export function validateSchemaConsistency(schema: SchemaDefinition): void {
  const expectedRefs = getComponentSchemaRefs();
  const actualRefs = collectSchemaComponentRefs(schema);
  const missingRefs = expectedRefs.filter(ref => !actualRefs.includes(ref));
  const extraRefs = actualRefs.filter(ref => !expectedRefs.includes(ref));

  const definitions = schema.definitions ?? {};
  const missingDefinitions = BUILT_IN_COMPONENTS.filter(componentName => !(componentName in definitions));

  if (missingRefs.length === 0 && extraRefs.length === 0 && missingDefinitions.length === 0) {
    return;
  }

  const problems: string[] = [];
  if (missingRefs.length > 0) {
    problems.push(`不足しているoneOf参照: ${missingRefs.join(', ')}`);
  }
  if (extraRefs.length > 0) {
    problems.push(`manifestに存在しないoneOf参照: ${extraRefs.join(', ')}`);
  }
  if (missingDefinitions.length > 0) {
    problems.push(`definitions不足: ${missingDefinitions.join(', ')}`);
  }

  throw new Error(`[SchemaManager] schema整合性エラー: ${problems.join(' / ')}`);
}

function collectSchemaComponentRefs(schema: SchemaDefinition): string[] {
  const definitions = schema.definitions;
  if (!definitions) {
    return [];
  }

  const componentDefinition = definitions.component;
  if (!componentDefinition || typeof componentDefinition !== 'object') {
    return [];
  }

  const oneOf = (componentDefinition as Record<string, unknown>).oneOf;
  if (!Array.isArray(oneOf)) {
    return [];
  }

  return oneOf
    .map(definition => {
      if (!definition || typeof definition !== 'object') {
        return undefined;
      }
      const ref = (definition as Record<string, unknown>).$ref;
      return typeof ref === 'string' ? ref : undefined;
    })
    .filter((ref): ref is string => Boolean(ref));
}
