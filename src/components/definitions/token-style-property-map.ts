import { COMPONENT_DEFINITIONS } from './component-definitions';

/** コンポーネント名 → `exporter-renderer-definitions` 由来の token 用 CSS プロパティ（kebab-case）。 */
const TOKEN_STYLE_PROPERTY_KEBAB_BY_NAME = new Map<string, string>();

/** コンポーネント名 → 既定テーマスロット ID（descriptor / T-201）。 */
const DEFAULT_TOKEN_SLOT_BY_NAME = new Map<string, string>();
const TOKEN_SLOTS_BY_NAME = new Map<string, string[]>();

for (const d of COMPONENT_DEFINITIONS) {
  if (d.tokenStyleProperty !== undefined) {
    TOKEN_STYLE_PROPERTY_KEBAB_BY_NAME.set(d.name, d.tokenStyleProperty);
  }
  if (d.defaultTokenSlot !== undefined) {
    DEFAULT_TOKEN_SLOT_BY_NAME.set(d.name, d.defaultTokenSlot);
  }
  if (d.tokenSlots !== undefined) {
    TOKEN_SLOTS_BY_NAME.set(d.name, [...d.tokenSlots]);
  }
}

export function getTokenStylePropertyKebab(componentName: string): string | undefined {
  return TOKEN_STYLE_PROPERTY_KEBAB_BY_NAME.get(componentName);
}

export function getDefaultTokenSlotForComponent(componentName: string): string | undefined {
  return DEFAULT_TOKEN_SLOT_BY_NAME.get(componentName);
}

export function getDeclaredTokenSlotsForComponent(componentName: string): string[] | undefined {
  const slots = TOKEN_SLOTS_BY_NAME.get(componentName);
  return slots ? [...slots] : undefined;
}

function tokenStylePropertyToCompatibleSlotSegment(property: string): string {
  switch (property) {
    case 'background-color':
      return 'background';
    case 'border-color':
      return 'border';
    case 'accent-color':
      return 'accent';
    default:
      return property;
  }
}

export function buildCompatibleTokenSlotId(componentName: string, property: string): string {
  return `${componentName.toLowerCase()}.${tokenStylePropertyToCompatibleSlotSegment(property)}`;
}

export function getCompatibleTokenSlotsForComponent(componentName: string): string[] {
  const declared = getDeclaredTokenSlotsForComponent(componentName);
  if (declared && declared.length > 0) {
    return declared;
  }

  const defaultSlot = getDefaultTokenSlotForComponent(componentName);
  if (defaultSlot) {
    return [defaultSlot];
  }

  const property = getTokenStylePropertyKebab(componentName);
  return property ? [buildCompatibleTokenSlotId(componentName, property)] : [];
}

/**
 * スロット ID を exporter 用の CSS カスタムプロパティ名へ（例: `text.color` → `--tui-slot-text-color`）。
 */
export function slotIdToTuiCssVarName(slotId: string): string {
  const body = slotId.replace(/\./g, '-');
  return `--tui-slot-${body}`;
}

export function slotIdToCssProperty(slotId: string): string | undefined {
  const suffix = slotId.split('.').pop();
  switch (suffix) {
    case 'color':
      return 'color';
    case 'background':
      return 'background-color';
    case 'border':
      return 'border-color';
    case 'accent':
      return 'accent-color';
    case 'height':
      return 'height';
    default:
      return undefined;
  }
}

export function tokenStyleKebabToReactCamel(kebab: string): string {
  return kebab.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}
