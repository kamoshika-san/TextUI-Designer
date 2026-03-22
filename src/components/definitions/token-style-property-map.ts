import { COMPONENT_DEFINITIONS } from './component-definitions';

/** コンポーネント名 → `exporter-renderer-definitions` 由来の token 用 CSS プロパティ（kebab-case）。 */
const TOKEN_STYLE_PROPERTY_KEBAB_BY_NAME = new Map<string, string>();

/** コンポーネント名 → 既定テーマスロット ID（descriptor / T-201）。 */
const DEFAULT_TOKEN_SLOT_BY_NAME = new Map<string, string>();

for (const d of COMPONENT_DEFINITIONS) {
  if (d.tokenStyleProperty !== undefined) {
    TOKEN_STYLE_PROPERTY_KEBAB_BY_NAME.set(d.name, d.tokenStyleProperty);
  }
  if (d.defaultTokenSlot !== undefined) {
    DEFAULT_TOKEN_SLOT_BY_NAME.set(d.name, d.defaultTokenSlot);
  }
}

export function getTokenStylePropertyKebab(componentName: string): string | undefined {
  return TOKEN_STYLE_PROPERTY_KEBAB_BY_NAME.get(componentName);
}

export function getDefaultTokenSlotForComponent(componentName: string): string | undefined {
  return DEFAULT_TOKEN_SLOT_BY_NAME.get(componentName);
}

/**
 * スロット ID を exporter 用の CSS カスタムプロパティ名へ（例: `text.color` → `--tui-slot-text-color`）。
 */
export function slotIdToTuiCssVarName(slotId: string): string {
  const body = slotId.replace(/\./g, '-');
  return `--tui-slot-${body}`;
}

export function tokenStyleKebabToReactCamel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}
