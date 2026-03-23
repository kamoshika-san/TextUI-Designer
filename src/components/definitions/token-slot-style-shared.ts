import {
  getCompatibleTokenSlotsForComponent,
  getDeclaredTokenSlotsForComponent,
  getTokenStylePropertyKebab,
  slotIdToCssProperty,
  slotIdToTuiCssVarName
} from './token-style-property-map';

export type ResolvedTokenSlotBinding = {
  slotId: string;
  property: string;
};

export function resolveComponentTokenSlotBindings(
  componentName: string,
  tokenSlots?: string[]
): ResolvedTokenSlotBinding[] {
  const preferredSlots =
    tokenSlots && tokenSlots.length > 0
      ? tokenSlots
      : getDeclaredTokenSlotsForComponent(componentName) ?? getCompatibleTokenSlotsForComponent(componentName);
  const fallbackProperty = getTokenStylePropertyKebab(componentName);
  if (!fallbackProperty) {
    return [];
  }

  const seen = new Set<string>();
  return preferredSlots
    .filter(slotId => {
      if (seen.has(slotId)) {
        return false;
      }
      seen.add(slotId);
      return true;
    })
    .map(slotId => ({
      slotId,
      property: slotIdToCssProperty(slotId) ?? fallbackProperty
    }));
}

export function formatResolvedTokenSlotValue(slotId: string, fallback: string): string {
  return `var(${slotIdToTuiCssVarName(slotId)}, ${fallback})`;
}
