import { COMPONENT_DEFINITIONS } from '../components/definitions/component-definitions';

export interface TextUIComponentCatalogEntry {
  name: string;
  description: string;
  requiredProps: string[];
  optionalProps: string[];
  supportsChildren: boolean;
  example: Record<string, unknown>;
}

function cloneEntry(entry: TextUIComponentCatalogEntry): TextUIComponentCatalogEntry {
  return {
    ...entry,
    requiredProps: [...entry.requiredProps],
    optionalProps: [...entry.optionalProps],
    example: JSON.parse(JSON.stringify(entry.example)) as Record<string, unknown>
  };
}

/**
 * MCP / TextUICoreEngine 向けコンポーネントカタログ。
 * メタの単一ソースは `COMPONENT_DEFINITIONS`（definitions の descriptor graph）。
 */
export function getTextUiComponentCatalog(): TextUIComponentCatalogEntry[] {
  return COMPONENT_DEFINITIONS.map((def) =>
    cloneEntry({
      name: def.name,
      description: def.catalogSummaryEn,
      requiredProps: def.requiredProps ?? [],
      optionalProps: def.optionalProps ?? [],
      supportsChildren: def.supportsChildren ?? false,
      example: def.example ?? {}
    })
  );
}
