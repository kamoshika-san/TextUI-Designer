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
}

export type ButtonKind = 'primary' | 'secondary' | 'submit';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonComponent {
  kind?: ButtonKind;
  label: string;
  submit?: boolean;
  disabled?: boolean;
  size?: ButtonSize;
}

export interface CheckboxComponent {
  label: string;
  name?: string;
  checked?: boolean;
  disabled?: boolean;
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
}

export type FormField =
  | ({ type: 'Input' } & InputComponent)
  | ({ type: 'Checkbox' } & CheckboxComponent)
  | ({ type: 'Radio' } & RadioComponent)
  | ({ type: 'Select' } & SelectComponent)
  | ({ type: 'Text' } & TextComponent)
  | ({ type: 'Divider' } & DividerComponent)
  | ({ type: 'Alert' } & AlertComponent)
  | ({ type: 'Container' } & ContainerComponent)
  | ({ type: 'Include'; components?: ComponentDef[]; [key: string]: any });

export type FormAction =
  | ({ type: 'Button' } & ButtonComponent)
  | ({ type: 'Include'; components?: ComponentDef[]; [key: string]: any });

export interface FormComponent {
  id?: string;
  fields: FormField[];
  actions?: FormAction[];
}

export type DividerOrientation = 'horizontal' | 'vertical';
export type DividerSpacing = 'sm' | 'md' | 'lg';

export interface DividerComponent {
  orientation?: DividerOrientation;
  spacing?: DividerSpacing;
}

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertComponent {
  variant?: AlertVariant;
  message: string;
  title?: string;
}

export type ContainerLayout = 'vertical' | 'horizontal' | 'flex' | 'grid';

export interface ContainerComponent {
  layout?: ContainerLayout;
  components?: ComponentDef[];
}

export interface IfComponent {
  condition: string;
  template: ComponentDef[];
}

export type ComponentDef =
  | ({ type: 'Text' } & TextComponent)
  | ({ type: 'Input' } & InputComponent)
  | ({ type: 'Button' } & ButtonComponent)
  | ({ type: 'Checkbox' } & CheckboxComponent)
  | ({ type: 'Form' } & FormComponent)
  | ({ type: 'Container' } & ContainerComponent)
  | ({ type: 'Radio' } & RadioComponent)
  | ({ type: 'Select' } & SelectComponent)
  | ({ type: 'Divider' } & DividerComponent)
  | ({ type: 'Alert' } & AlertComponent)
  | ({ type: 'Include'; components?: ComponentDef[]; [key: string]: any })
  | ({ type: 'If' } & IfComponent);

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

// 型ガード関数（typeベースに修正）
export function isTextComponent(comp: ComponentDef): comp is ({ type: 'Text' } & TextComponent) {
  return comp.type === 'Text';
}
export function isInputComponent(comp: any): comp is ({ type: 'Input' } & InputComponent) {
  return comp.type === 'Input';
}
export function isButtonComponent(comp: ComponentDef): comp is ({ type: 'Button' } & ButtonComponent) {
  return comp.type === 'Button';
}
export function isCheckboxComponent(comp: ComponentDef): comp is ({ type: 'Checkbox' } & CheckboxComponent) {
  return comp.type === 'Checkbox';
}
export function isRadioComponent(comp: ComponentDef): comp is ({ type: 'Radio' } & RadioComponent) {
  return comp.type === 'Radio';
}
export function isSelectComponent(comp: ComponentDef): comp is ({ type: 'Select' } & SelectComponent) {
  return comp.type === 'Select';
}
export function isDividerComponent(comp: ComponentDef): comp is ({ type: 'Divider' } & DividerComponent) {
  return comp.type === 'Divider';
}
export function isAlertComponent(comp: ComponentDef): comp is ({ type: 'Alert' } & AlertComponent) {
  return comp.type === 'Alert';
}
export function isContainerComponent(comp: ComponentDef): comp is ({ type: 'Container' } & ContainerComponent) {
  return comp.type === 'Container';
}
export function isFormComponent(comp: ComponentDef): comp is ({ type: 'Form' } & FormComponent) {
  return comp.type === 'Form';
}
export function isIncludeComponent(comp: ComponentDef): comp is ({ type: 'Include'; components?: ComponentDef[] }) {
  return comp.type === 'Include';
}

// FormField用の型ガード関数
export function isInputField(field: FormField): field is ({ type: 'Input' } & InputComponent) {
  return (field as any).type === 'Input';
}
export function isCheckboxField(field: FormField): field is ({ type: 'Checkbox' } & CheckboxComponent) {
  return (field as any).type === 'Checkbox';
}
export function isRadioField(field: FormField): field is ({ type: 'Radio' } & RadioComponent) {
  return (field as any).type === 'Radio';
}
export function isSelectField(field: FormField): field is ({ type: 'Select' } & SelectComponent) {
  return (field as any).type === 'Select';
}

// FormAction用の型ガード関数
export function isButtonAction(action: FormAction): action is ({ type: 'Button' } & ButtonComponent) {
  return action.type === 'Button';
} 