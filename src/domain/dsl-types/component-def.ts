/**
 * ComponentDef union and guard bundle for Sprint 2.
 * Uses the normalized category files (text-navigation-media.ts, form.ts,
 * layout-compound.ts, button.ts) as canonical inputs before aggregating
 * the union and guards here; `DSL_COMPONENT_KINDS` is derived from the
 * `BUILT_IN_COMPONENTS` list so the dependency stays linear.
 */

import { BUILT_IN_COMPONENTS } from '../../components/definitions/built-in-components';
import type { ButtonComponent } from './button';
import type {
  BadgeComponent,
  BreadcrumbComponent,
  IconComponent,
  ImageComponent,
  LinkComponent,
  ProgressComponent,
  TextComponent
} from './text-navigation-media';
import type {
  CheckboxComponent,
  DatePickerComponent,
  FormComponent,
  InputComponent,
  RadioComponent,
  SelectComponent
} from './form';
import type {
  AccordionComponent,
  AlertComponent,
  ContainerComponent,
  DividerComponent,
  SpacerComponent,
  TableComponent,
  TabsComponent,
  TreeViewComponent
} from './layout-compound';

export type ComponentDef =
  // Text / navigation / media primitives
  | { Text: TextComponent }
  | { Link: LinkComponent }
  | { Breadcrumb: BreadcrumbComponent }
  | { Badge: BadgeComponent }
  | { Progress: ProgressComponent }
  | { Image: ImageComponent }
  | { Icon: IconComponent }
  // Buttons and form/input clusters
  | { Button: ButtonComponent }
  | { Input: InputComponent }
  | { Form: FormComponent }
  | { Checkbox: CheckboxComponent }
  | { Radio: RadioComponent }
  | { Select: SelectComponent }
  | { DatePicker: DatePickerComponent }
  // Layout / compound structures
  | { Container: ContainerComponent }
  | { Divider: DividerComponent }
  | { Spacer: SpacerComponent }
  | { Alert: AlertComponent }
  | { Accordion: AccordionComponent }
  | { Tabs: TabsComponent }
  | { TreeView: TreeViewComponent }
  | { Table: TableComponent };

export interface PageDef {
  id: string;
  title: string;
  layout: string;
  components: ComponentDef[];
}

export interface TextUIDSL {
  page: PageDef;
}

// Component type helpers
export type ComponentType = keyof ComponentDef;
export type ExtractComponentProps<T extends ComponentType> = ComponentDef[T];

// Guard helpers by category
export function isTextComponent(comp: ComponentDef): comp is { Text: TextComponent } {
  return 'Text' in comp;
}

export function isLinkComponent(comp: ComponentDef): comp is { Link: LinkComponent } {
  return 'Link' in comp;
}

export function isBreadcrumbComponent(comp: ComponentDef): comp is { Breadcrumb: BreadcrumbComponent } {
  return 'Breadcrumb' in comp;
}

export function isBadgeComponent(comp: ComponentDef): comp is { Badge: BadgeComponent } {
  return 'Badge' in comp;
}

export function isProgressComponent(comp: ComponentDef): comp is { Progress: ProgressComponent } {
  return 'Progress' in comp;
}

export function isImageComponent(comp: ComponentDef): comp is { Image: ImageComponent } {
  return 'Image' in comp;
}

export function isIconComponent(comp: ComponentDef): comp is { Icon: IconComponent } {
  return 'Icon' in comp;
}

export function isButtonComponent(comp: ComponentDef): comp is { Button: ButtonComponent } {
  return 'Button' in comp;
}

export function isInputComponent(comp: ComponentDef): comp is { Input: InputComponent } {
  return 'Input' in comp;
}

export function isFormComponent(comp: ComponentDef): comp is { Form: FormComponent } {
  return 'Form' in comp;
}

export function isCheckboxComponent(comp: ComponentDef): comp is { Checkbox: CheckboxComponent } {
  return 'Checkbox' in comp;
}

export function isRadioComponent(comp: ComponentDef): comp is { Radio: RadioComponent } {
  return 'Radio' in comp;
}

export function isSelectComponent(comp: ComponentDef): comp is { Select: SelectComponent } {
  return 'Select' in comp;
}

export function isDatePickerComponent(comp: ComponentDef): comp is { DatePicker: DatePickerComponent } {
  return 'DatePicker' in comp;
}

export function isContainerComponent(comp: ComponentDef): comp is { Container: ContainerComponent } {
  return 'Container' in comp;
}

export function isDividerComponent(comp: ComponentDef): comp is { Divider: DividerComponent } {
  return 'Divider' in comp;
}

export function isSpacerComponent(comp: ComponentDef): comp is { Spacer: SpacerComponent } {
  return 'Spacer' in comp;
}

export function isAlertComponent(comp: ComponentDef): comp is { Alert: AlertComponent } {
  return 'Alert' in comp;
}

export function isAccordionComponent(comp: ComponentDef): comp is { Accordion: AccordionComponent } {
  return 'Accordion' in comp;
}

export function isTabsComponent(comp: ComponentDef): comp is { Tabs: TabsComponent } {
  return 'Tabs' in comp;
}

export function isTreeViewComponent(comp: ComponentDef): comp is { TreeView: TreeViewComponent } {
  return 'TreeView' in comp;
}

export function isTableComponent(comp: ComponentDef): comp is { Table: TableComponent } {
  return 'Table' in comp;
}

/**
 * DSL_COMPONENT_KINDS mirrors `BUILT_IN_COMPONENTS` so the descriptor sync tests
 * can keep DSL and component registries aligned. The set is checked by the
 * descriptor sync helper, so keep this list derived rather than manually copied.
 */
export const DSL_COMPONENT_KINDS = BUILT_IN_COMPONENTS;
export type DslComponentKind = (typeof DSL_COMPONENT_KINDS)[number];

const COMPONENT_DEF_KEYS = new Set<string>(DSL_COMPONENT_KINDS);

export function isComponentDefValue(value: unknown): value is ComponentDef {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value as Record<string, unknown>);
  return keys.length === 1 && COMPONENT_DEF_KEYS.has(keys[0]);
}
