/**
 * Form/input family canonical host for Sprint 2. This file owns all form,
 * input, option, and action contracts and only pulls in foundation helpers
 * (layout/media contracts) that remain nested inside form fields.
 */

import type { ButtonComponent } from './button';
import type {
  AlertComponent,
  ContainerComponent,
  DividerComponent,
  SpacerComponent,
  TableComponent,
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

export type InputType = 'text' | 'email' | 'password' | 'number' | 'multiline';

// Input primitives
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

// Field aggregations mixing inputs and nested layout/media helpers
export interface FormField {
  Input?: InputComponent;
  Checkbox?: CheckboxComponent;
  Radio?: RadioComponent;
  Select?: SelectComponent;
  DatePicker?: DatePickerComponent;
  Text?: TextComponent;
  Divider?: DividerComponent;
  Spacer?: SpacerComponent;
  TreeView?: TreeViewComponent;
  Alert?: AlertComponent;
  Container?: ContainerComponent;
  Table?: TableComponent;
  Link?: LinkComponent;
  Breadcrumb?: BreadcrumbComponent;
  Badge?: BadgeComponent;
  Progress?: ProgressComponent;
  Image?: ImageComponent;
  Icon?: IconComponent;
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
