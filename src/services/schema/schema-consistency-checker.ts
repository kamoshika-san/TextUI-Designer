import type { SchemaDefinition } from '../../types';
import { getComponentDefinitionNames, getComponentSchemaRefs } from './schema-descriptor-selectors';

export function validateSchemaConsistency(schema: SchemaDefinition): void {
  const expectedRefs = getComponentSchemaRefs();
  const { actualRefs, problems: componentOneOfProblems } = collectSchemaComponentRefsWithProblems(schema);

  const expectedSet = new Set(expectedRefs);
  const actualSet = new Set(actualRefs);
  const missingRefs = expectedRefs.filter(ref => !actualSet.has(ref));
  const extraRefs = actualRefs.filter(ref => !expectedSet.has(ref));

  const definitions = schema.definitions ?? {};
  const missingDefinitions = getComponentDefinitionNames().filter(name => !(name in definitions));

  const orderedMatch = actualRefs.length === expectedRefs.length && actualRefs.every((ref, i) => ref === expectedRefs[i]);
  const duplicateRefs = collectDuplicateRefs(actualRefs);
  const oneOfProblems: string[] = [];

  oneOfProblems.push(...componentOneOfProblems);
  if (duplicateRefs.length > 0) {
    oneOfProblems.push(`oneOf重複参照: ${Array.from(new Set(duplicateRefs)).join(', ')}`);
  }
  if (componentOneOfProblems.length === 0 && !orderedMatch && actualRefs.length > 0) {
    oneOfProblems.push('oneOf順序不一致（同集合でも順序差を検知）');
  }

  if (missingRefs.length === 0 && extraRefs.length === 0 && missingDefinitions.length === 0 && oneOfProblems.length === 0) {
    return;
  }

  const problems: string[] = [];
  if (missingRefs.length > 0) {
    problems.push(`不足しているoneOf参照: ${missingRefs.join(', ')}`);
  }
  if (extraRefs.length > 0) {
    problems.push(`descriptor に存在しない oneOf 参照: ${extraRefs.join(', ')}`);
  }
  if (missingDefinitions.length > 0) {
    problems.push(`definitions不足: ${missingDefinitions.join(', ')}`);
  }
  if (oneOfProblems.length > 0) {
    problems.push(...oneOfProblems);
  }

  throw new Error(`[SchemaManager] schema整合性エラー: ${problems.join(' / ')}`);
}

function collectDuplicateRefs(refs: string[]): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const ref of refs) {
    if (seen.has(ref)) {
      duplicates.push(ref);
      continue;
    }
    seen.add(ref);
  }
  return duplicates;
}

function collectSchemaComponentRefsWithProblems(schema: SchemaDefinition): { actualRefs: string[]; problems: string[] } {
  const problems: string[] = [];
  const definitions = schema.definitions;
  if (!definitions || typeof definitions !== 'object') {
    return { actualRefs: [], problems };
  }

  const componentDefinition = (definitions as Record<string, unknown>).component;
  if (!componentDefinition || typeof componentDefinition !== 'object') {
    problems.push('definitions.component が見つからない / 型が不正');
    return { actualRefs: [], problems };
  }

  const oneOf = (componentDefinition as Record<string, unknown>).oneOf;
  if (!Array.isArray(oneOf)) {
    problems.push('definitions.component.oneOf が配列ではない / 見つからない');
    return { actualRefs: [], problems };
  }

  const actualRefs = oneOf
    .map(definition => {
      if (!definition || typeof definition !== 'object') {
        return undefined;
      }
      const ref = (definition as Record<string, unknown>).$ref;
      return typeof ref === 'string' ? ref : undefined;
    })
    .filter((ref): ref is string => Boolean(ref));

  return { actualRefs, problems };
}
