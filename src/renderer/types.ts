// TextUI DSL 型定義

export type TextVariant = 'h1' | 'h2' | 'h3' | 'p' | 'small' | 'caption';
export type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextColor = 'text-gray-300' | 'text-gray-400' | 'text-gray-500' | 'text-gray-600' | 'text-gray-700' | 'text-gray-900';

export interface TextComponent {
  variant?: TextVariant;
  value: string;
  size?: TextSize;
  weight?: TextWeight;
  color?: TextColor;
  token?: string;
}

export type InputType = 'text' | 'email' | 'password' | 'number' | 'multiline';

export interface InputComponent {
  label?: string;
  name?: string;
  type?: InputType;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  token?: string;
}

export type ButtonKind = 'primary' | 'secondary' | 'submit';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonComponent {
  kind?: ButtonKind;
  label: string;
  submit?: boolean;
  disabled?: boolean;
  size?: ButtonSize;
  token?: string;
}

export interface CheckboxComponent {
  label: string;
  name?: string;
  checked?: boolean;
  disabled?: boolean;
  token?: string;
}

export interface RadioOption {
  label: string;
  value: string;
  checked?: boolean;
}

export interface RadioComponent {
  label?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  options?: RadioOption[];
  token?: string;
}

export interface SelectOption {
  label: string;
  value: string;
  selected?: boolean;
}

export interface SelectComponent {
  label?: string;
  name?: string;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  token?: string;
}

export interface DatePickerComponent {
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  value?: string;
  token?: string;
}

export interface FormField {
  Input?: InputComponent;
  Checkbox?: CheckboxComponent;
  Radio?: RadioComponent;
  Select?: SelectComponent;
  DatePicker?: DatePickerComponent;
  Text?: TextComponent;
  Divider?: DividerComponent;
  Alert?: AlertComponent;
  Container?: ContainerComponent;
  Table?: TableComponent;
}

export interface FormAction {
  Button: ButtonComponent;
}

export interface FormComponent {
  id?: string;
  fields: FormField[];
  actions?: FormAction[];
  token?: string;
}

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerSpacing = 'sm' | 'md' | 'lg';

export interface DividerComponent {
  orientation?: DividerOrientation;
  spacing?: DividerSpacing;
  token?: string;
}

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertComponent {
  variant?: AlertVariant;
  message: string;
  title?: string;
  token?: string;
}

export interface AccordionItem {
  title: string;
  content?: string;
  components?: ComponentDef[];
  open?: boolean;
}

export interface AccordionComponent {
  allowMultiple?: boolean;
  items: AccordionItem[];
  token?: string;
}

export interface TabsItem {
  label: string;
  disabled?: boolean;
  components?: ComponentDef[];
}

export interface TabsComponent {
  defaultTab?: number;
  items: TabsItem[];
  token?: string;
}

export interface TableColumn {
  key: string;
  header: string;
}

export interface TableComponent {
  columns: TableColumn[];
  rows: Record<string, string | number | boolean | null>[];
  striped?: boolean;
  width?: string;
  token?: string;
}

export type ContainerLayout = 'vertical' | 'horizontal' | 'flex' | 'grid';

export interface ContainerComponent {
  layout?: ContainerLayout;
  components?: ComponentDef[];
  width?: string;
  token?: string;
}

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
  | { Alert: AlertComponent }
  | { Accordion: AccordionComponent }
  | { Tabs: TabsComponent }
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

export function isTableComponent(comp: ComponentDef): comp is { Table: TableComponent } {
  return 'Table' in comp;
}
