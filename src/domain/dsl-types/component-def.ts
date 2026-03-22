/**
 * ComponentDef 判別ユニオン・ページ定義・型ガード（RF1-S2）。
 */

import { BUILT_IN_COMPONENTS } from '../../components/definitions/built-in-components';

import type { ButtonComponent } from './button';
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
import type {
  BadgeComponent,
  BreadcrumbComponent,
  IconComponent,
  ImageComponent,
  LinkComponent,
  ProgressComponent,
  TextComponent
} from './text-navigation-media';

export type ComponentDef =
  | { Text: TextComponent }
  | { Input: InputComponent }
  | { Button: ButtonComponent }
  | { Checkbox: CheckboxComponent }
  | { Form: FormComponent }
  | { Container: ContainerComponent }
  | { Radio: RadioComponent }
  | { Select: SelectComponent }
  | { DatePicker: DatePickerComponent }
  | { Divider: DividerComponent }
  | { Spacer: SpacerComponent }
  | { Alert: AlertComponent }
  | { Accordion: AccordionComponent }
  | { Tabs: TabsComponent }
  | { TreeView: TreeViewComponent }
  | { Table: TableComponent }
  | { Link: LinkComponent }
  | { Breadcrumb: BreadcrumbComponent }
  | { Badge: BadgeComponent }
  | { Progress: ProgressComponent }
  | { Image: ImageComponent }
  | { Icon: IconComponent };

export interface PageDef {
  id: string;
  title: string;
  layout: string;
  components: ComponentDef[];
}

export interface TextUIDSL {
  page: PageDef;
}

// ユーティリティ型
export type ComponentType = keyof ComponentDef;

export type ExtractComponentProps<T extends ComponentType> = ComponentDef[T];

// 型ガード関数
export function isTextComponent(comp: ComponentDef): comp is { Text: TextComponent } {
  return 'Text' in comp;
}

export function isInputComponent(comp: ComponentDef): comp is { Input: InputComponent } {
  return 'Input' in comp;
}

export function isButtonComponent(comp: ComponentDef): comp is { Button: ButtonComponent } {
  return 'Button' in comp;
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

export function isDividerComponent(comp: ComponentDef): comp is { Divider: DividerComponent } {
  return 'Divider' in comp;
}

export function isSpacerComponent(comp: ComponentDef): comp is { Spacer: SpacerComponent } {
  return 'Spacer' in comp;
}

export function isAlertComponent(comp: ComponentDef): comp is { Alert: AlertComponent } {
  return 'Alert' in comp;
}

export function isContainerComponent(comp: ComponentDef): comp is { Container: ContainerComponent } {
  return 'Container' in comp;
}

export function isFormComponent(comp: ComponentDef): comp is { Form: FormComponent } {
  return 'Form' in comp;
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

/**
 * `ComponentDef` の判別キー。正本は `built-in-components.ts` の `BUILT_IN_COMPONENTS`（T-20260321-091）。
 * 新コンポーネント追加時は **同ファイルの列挙**を更新すれば DSL 側の集合も一致する。
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
