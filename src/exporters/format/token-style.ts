import {
  getDeclaredTokenSlotsForComponent,
  getDefaultTokenSlotForComponent,
  getTokenStylePropertyKebab,
  slotIdToTuiCssVarName
} from '../../components/definitions/token-style-property-map';
import { themeStyleResolver } from '../theme-style-resolver';
import { escapeAttribute } from './escaping';

type TokenStyleAttrMode = 'raw' | 'suffix' | 'modifier';

export function getHtmlTokenStyleAttr(componentType: string, token?: string, tokenSlots?: string[]): string {
  return buildTokenStyleAttr(componentType, token, 'raw', tokenSlots);
}

export function getPugTokenStyleAttr(componentType: string, token?: string, tokenSlots?: string[]): string {
  return buildTokenStyleAttr(componentType, token, 'raw', tokenSlots);
}

export function getPugTokenStyleSuffix(componentType: string, token?: string, tokenSlots?: string[]): string {
  return buildTokenStyleAttr(componentType, token, 'suffix', tokenSlots);
}

export function getPugTokenStyleModifier(componentType: string, token?: string, tokenSlots?: string[]): string {
  return buildTokenStyleAttr(componentType, token, 'modifier', tokenSlots);
}

export function getReactTokenStyleProp(componentType: string, token?: string, tokenSlots?: string[]): string {
  const property = resolveTokenStyleProperty(componentType);
  if (!property || !token) {
    return '';
  }

  const declaredSlots = getDeclaredTokenSlotsForComponent(componentType);
  const shouldResolveBindings = (tokenSlots && tokenSlots.length > 0) || (declaredSlots && declaredSlots.length > 0);
  if (shouldResolveBindings) {
    const bindings = themeStyleResolver.resolveComponentTokenSlotBindings(componentType, tokenSlots);
    if (bindings.length > 0) {
      const pairs = bindings.map(binding =>
        `${toReactStyleProperty(binding.property)}: ${JSON.stringify(themeStyleResolver.formatResolvedTokenSlotValue(binding.slotId, token))}`
      );
      return ` style={{ ${pairs.join(', ')} }}`;
    }
  }

  const reactProperty = toReactStyleProperty(property);
  const defaultTokenSlot = getDefaultTokenSlotForComponent(componentType);
  const valueExpr = defaultTokenSlot
    ? JSON.stringify(`var(${slotIdToTuiCssVarName(defaultTokenSlot)}, ${token})`)
    : JSON.stringify(token);
  return ` style={{ ${reactProperty}: ${valueExpr} }}`;
}

export function getReactTokenStyleInline(componentType: string, token?: string, tokenSlots?: string[]): string {
  return getReactTokenStyleProp(componentType, token, tokenSlots).trim();
}

function buildTokenStyleAttr(
  componentType: string,
  token: string | undefined,
  mode: TokenStyleAttrMode,
  tokenSlots?: string[]
): string {
  const property = resolveTokenStyleProperty(componentType);
  if (!property || !token) {
    return '';
  }

  const raw = ` style="${buildInlineCssDeclarations(componentType, token, tokenSlots)}"`;
  if (mode === 'suffix') {
    return raw;
  }
  if (mode === 'modifier') {
    return `(${raw.trim()})`;
  }
  return raw;
}

function buildInlineCssDeclarations(componentType: string, token: string, tokenSlots?: string[]): string {
  const declaredSlots = getDeclaredTokenSlotsForComponent(componentType);
  const shouldResolveBindings = (tokenSlots && tokenSlots.length > 0) || (declaredSlots && declaredSlots.length > 0);
  if (shouldResolveBindings) {
    const declarations = themeStyleResolver
      .resolveComponentTokenSlotBindings(componentType, tokenSlots)
      .map(binding => `${binding.property}: ${themeStyleResolver.formatResolvedTokenSlotValue(binding.slotId, escapeAttribute(token))};`);
    if (declarations.length > 0) {
      return declarations.join(' ');
    }
  }

  const property = resolveTokenStyleProperty(componentType);
  if (!property) {
    return '';
  }

  const defaultTokenSlot = getDefaultTokenSlotForComponent(componentType);
  return buildInlineCssDeclaration(property, token, defaultTokenSlot);
}

function buildInlineCssDeclaration(property: string, token: string, defaultTokenSlot?: string): string {
  if (defaultTokenSlot) {
    const cssVar = slotIdToTuiCssVarName(defaultTokenSlot);
    return `${property}: var(${cssVar}, ${escapeAttribute(token)});`;
  }
  return `${property}: ${escapeAttribute(token)};`;
}

function resolveTokenStyleProperty(componentType: string): string | undefined {
  return getTokenStylePropertyKebab(componentType);
}

function toReactStyleProperty(property: string): string {
  return property.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
}

