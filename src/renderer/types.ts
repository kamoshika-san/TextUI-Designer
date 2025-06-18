// TextUI DSL 型定義

export type TextVariant = 'h1' | 'h2' | 'h3' | 'p' | 'small' | 'caption';

export interface TextComponent {
  variant: TextVariant;
  value: string;
}

export type InputType = 'text' | 'email' | 'password' | 'number';

export interface InputComponent {
  label: string;
  name: string;
  type: InputType;
  required?: boolean;
  multiline?: boolean;
}

export type ButtonKind = 'primary' | 'secondary' | 'submit';

export interface ButtonComponent {
  kind: ButtonKind;
  label: string;
  submit?: boolean;
}

export interface CheckboxComponent {
  label: string;
  name: string;
}

export interface FormField {
  Input?: InputComponent;
  Checkbox?: CheckboxComponent;
}

export interface FormAction {
  Button: ButtonComponent;
}

export interface FormComponent {
  id: string;
  fields: FormField[];
  actions: FormAction[];
}

export interface RadioComponent {
  name: string;
  options: { label: string; value: string }[];
  selected?: string;
}

export interface SelectComponent {
  name: string;
  options: { label: string; value: string }[];
  selected?: string;
}

export interface DividerComponent {
  label?: string;
}

export interface AlertComponent {
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export type ComponentDef =
  | { Text: TextComponent }
  | { Input: InputComponent }
  | { Button: ButtonComponent }
  | { Checkbox: CheckboxComponent }
  | { Form: FormComponent }
  | { Container: { layout: string; components: ComponentDef[] } }
  | { Radio: RadioComponent }
  | { Select: SelectComponent }
  | { Divider: DividerComponent }
  | { Alert: AlertComponent };

export interface PageDef {
  id: string;
  title: string;
  layout: string;
  components: ComponentDef[];
}

export interface TextUIDSL {
  page: PageDef;
} 