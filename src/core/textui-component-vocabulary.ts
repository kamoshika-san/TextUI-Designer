/**
 * Component vocabulary normalization for semantic diff summaries.
 *
 * Converts a ComponentDef into a human-readable vocabulary entry without
 * exposing DSL internals (type discriminants, internal keys, path structure).
 *
 * Design rules:
 *   - Pure functions only. No side effects.
 *   - displayName is always defined (falls back to component type name).
 *   - labelText is null when no meaningful label/title property is present.
 *   - Vocabulary describes what the component IS, not how it is keyed in DSL.
 *   - DSL internal field names (e.g., `variant`, `kind`) are never surfaced in output.
 */

import type { ComponentDef } from '../domain/dsl-types/component-def';
import type { ButtonKind } from '../domain/dsl-types/button';
import type { AlertVariant } from '../domain/dsl-types/layout-compound';
import type { TextVariant } from '../domain/dsl-types/text-navigation-media';
import type { BadgeVariant } from '../domain/dsl-types/text-navigation-media';

// -- Output type --------------------------------------------------------------

export interface ComponentVocabulary {
  /**
   * Human-readable display name for the component.
   * Examples: "Primary Button", "Alert (warning)", "2-Column Form", "Input"
   */
  displayName: string;
  /**
   * The raw component type (e.g., "Button", "Alert", "Form").
   * Used for grouping and icon resolution by UI layers.
   */
  componentType: string;
  /**
   * The most meaningful user-visible label or title from the component's props.
   * null when no suitable label/title property exists.
   * Examples: "Save", "Email address", "Are you sure?"
   */
  labelText: string | null;
}

// -- Internal helpers ---------------------------------------------------------

function trimOrNull(value: unknown): string | null {
  if (typeof value !== 'string') { return null; }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buttonDisplayName(kind: ButtonKind | undefined): string {
  switch (kind) {
    case 'primary':   return 'Primary Button';
    case 'secondary': return 'Secondary Button';
    case 'submit':    return 'Submit Button';
    default:          return 'Button';
  }
}

function alertDisplayName(variant: AlertVariant | undefined): string {
  switch (variant) {
    case 'info':    return 'Alert (info)';
    case 'success': return 'Alert (success)';
    case 'warning': return 'Alert (warning)';
    case 'error':   return 'Alert (error)';
    default:        return 'Alert';
  }
}

function textDisplayName(variant: TextVariant | undefined): string {
  switch (variant) {
    case 'h1':      return 'Heading 1';
    case 'h2':      return 'Heading 2';
    case 'h3':      return 'Heading 3';
    case 'p':       return 'Paragraph';
    case 'small':   return 'Small Text';
    case 'caption': return 'Caption';
    default:        return 'Text';
  }
}

function badgeDisplayName(variant: BadgeVariant | undefined): string {
  switch (variant) {
    case 'primary': return 'Primary Badge';
    case 'success': return 'Success Badge';
    case 'warning': return 'Warning Badge';
    case 'error':   return 'Error Badge';
    default:        return 'Badge';
  }
}

// -- Per-component normalizers ------------------------------------------------

function normalizeButton(props: Record<string, unknown>): ComponentVocabulary {
  return {
    displayName: buttonDisplayName(props['kind'] as ButtonKind | undefined),
    componentType: 'Button',
    labelText: trimOrNull(props['label']),
  };
}

function normalizeInput(props: Record<string, unknown>): ComponentVocabulary {
  const typeLabel = props['type'] === 'email' ? 'Email Input'
    : props['type'] === 'password' ? 'Password Input'
    : props['type'] === 'number' ? 'Number Input'
    : props['type'] === 'multiline' || props['multiline'] === true ? 'Textarea'
    : 'Input';
  return {
    displayName: typeLabel,
    componentType: 'Input',
    labelText: trimOrNull(props['label']) ?? trimOrNull(props['placeholder']),
  };
}

function normalizeForm(props: Record<string, unknown>): ComponentVocabulary {
  const fields = Array.isArray(props['fields']) ? props['fields'] : [];
  const fieldCount = fields.length;
  const displayName = fieldCount > 0 ? `Form (${fieldCount} field${fieldCount !== 1 ? 's' : ''})` : 'Form';
  return {
    displayName,
    componentType: 'Form',
    labelText: null,
  };
}

function normalizeAlert(props: Record<string, unknown>): ComponentVocabulary {
  return {
    displayName: alertDisplayName(props['variant'] as AlertVariant | undefined),
    componentType: 'Alert',
    labelText: trimOrNull(props['message']) ?? trimOrNull(props['title']),
  };
}

function normalizeText(props: Record<string, unknown>): ComponentVocabulary {
  return {
    displayName: textDisplayName(props['variant'] as TextVariant | undefined),
    componentType: 'Text',
    labelText: trimOrNull(props['value']),
  };
}

function normalizeModal(props: Record<string, unknown>): ComponentVocabulary {
  return {
    displayName: 'Modal',
    componentType: 'Modal',
    labelText: trimOrNull(props['title']) ?? trimOrNull(props['body']),
  };
}

function normalizeTabs(props: Record<string, unknown>): ComponentVocabulary {
  const items = Array.isArray(props['items']) ? props['items'] : [];
  const count = items.length;
  const displayName = count > 0 ? `Tabs (${count} tab${count !== 1 ? 's' : ''})` : 'Tabs';
  return {
    displayName,
    componentType: 'Tabs',
    labelText: null,
  };
}

function normalizeAccordion(props: Record<string, unknown>): ComponentVocabulary {
  const items = Array.isArray(props['items']) ? props['items'] : [];
  const count = items.length;
  const displayName = count > 0 ? `Accordion (${count} item${count !== 1 ? 's' : ''})` : 'Accordion';
  return {
    displayName,
    componentType: 'Accordion',
    labelText: null,
  };
}

function normalizeTable(props: Record<string, unknown>): ComponentVocabulary {
  const columns = Array.isArray(props['columns']) ? props['columns'] : [];
  const count = columns.length;
  const displayName = count > 0 ? `Table (${count} column${count !== 1 ? 's' : ''})` : 'Table';
  return {
    displayName,
    componentType: 'Table',
    labelText: null,
  };
}

function normalizeBadge(props: Record<string, unknown>): ComponentVocabulary {
  return {
    displayName: badgeDisplayName(props['variant'] as BadgeVariant | undefined),
    componentType: 'Badge',
    labelText: trimOrNull(props['label']),
  };
}

function normalizeSelect(props: Record<string, unknown>): ComponentVocabulary {
  const displayName = props['multiple'] === true ? 'Multi-Select' : 'Select';
  return {
    displayName,
    componentType: 'Select',
    labelText: trimOrNull(props['label']) ?? trimOrNull(props['placeholder']),
  };
}

function normalizeContainer(props: Record<string, unknown>): ComponentVocabulary {
  const layout = props['layout'];
  const displayName = typeof layout === 'string' && layout.length > 0
    ? `Container (${layout})`
    : 'Container';
  return {
    displayName,
    componentType: 'Container',
    labelText: null,
  };
}

/** Generic fallback for components without dedicated normalizers. */
function normalizeGeneric(componentType: string, props: Record<string, unknown>): ComponentVocabulary {
  const labelText =
    trimOrNull(props['label']) ??
    trimOrNull(props['title']) ??
    trimOrNull(props['value']) ??
    trimOrNull(props['name']) ??
    null;
  return {
    displayName: componentType,
    componentType,
    labelText,
  };
}

// -- Public API ---------------------------------------------------------------

/**
 * Normalize a ComponentDef into a human-readable vocabulary entry.
 *
 * The returned displayName is always safe to show to reviewers.
 * No DSL internals (type keys, field names, path segments) are exposed.
 */
export function normalizeComponentVocabulary(comp: ComponentDef): ComponentVocabulary {
  // ComponentDef is a branded single-key object: { Button: {...} }
  const entries = Object.entries(comp as Record<string, unknown>);
  if (entries.length !== 1) {
    return { displayName: 'Unknown Component', componentType: 'Unknown', labelText: null };
  }

  const [componentType, rawProps] = entries[0];
  const props: Record<string, unknown> = (typeof rawProps === 'object' && rawProps !== null && !Array.isArray(rawProps))
    ? rawProps as Record<string, unknown>
    : {};

  switch (componentType) {
    case 'Button':     return normalizeButton(props);
    case 'Input':      return normalizeInput(props);
    case 'Form':       return normalizeForm(props);
    case 'Alert':      return normalizeAlert(props);
    case 'Text':       return normalizeText(props);
    case 'Modal':      return normalizeModal(props);
    case 'Tabs':       return normalizeTabs(props);
    case 'Accordion':  return normalizeAccordion(props);
    case 'Table':      return normalizeTable(props);
    case 'Badge':      return normalizeBadge(props);
    case 'Select':     return normalizeSelect(props);
    case 'Container':  return normalizeContainer(props);
    case 'Checkbox':   return normalizeGeneric('Checkbox', props);
    case 'Radio':      return normalizeGeneric('Radio', props);
    case 'DatePicker': return normalizeGeneric('Date Picker', props);
    case 'Divider':    return normalizeGeneric('Divider', props);
    case 'Spacer':     return normalizeGeneric('Spacer', props);
    case 'Link':       return normalizeGeneric('Link', props);
    case 'Breadcrumb': return normalizeGeneric('Breadcrumb', props);
    case 'Progress':   return normalizeGeneric('Progress', props);
    case 'Image':      return normalizeGeneric('Image', props);
    case 'Icon':       return normalizeGeneric('Icon', props);
    case 'TreeView':   return normalizeGeneric('Tree View', props);
    default:           return normalizeGeneric(componentType, props);
  }
}
