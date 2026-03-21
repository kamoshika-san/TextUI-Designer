import { COMPONENT_DEFINITIONS } from './component-definitions';

/** コンポーネント名 → `exporter-renderer-definitions` 由来の token 用 CSS プロパティ（kebab-case）。 */
const TOKEN_STYLE_PROPERTY_KEBAB_BY_NAME = new Map<string, string>();

for (const d of COMPONENT_DEFINITIONS) {
  if (d.tokenStyleProperty !== undefined) {
    TOKEN_STYLE_PROPERTY_KEBAB_BY_NAME.set(d.name, d.tokenStyleProperty);
  }
}

export function getTokenStylePropertyKebab(componentName: string): string | undefined {
  return TOKEN_STYLE_PROPERTY_KEBAB_BY_NAME.get(componentName);
}

export function tokenStyleKebabToReactCamel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}
