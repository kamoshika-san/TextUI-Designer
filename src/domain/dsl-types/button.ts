/**
 * Button DSL コンポーネント型（RF1-S2-T2、フォーム actions と共用）。
 */

export type ButtonKind = 'primary' | 'secondary' | 'submit';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonComponent {
  kind?: ButtonKind;
  label?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
  submit?: boolean;
  disabled?: boolean;
  size?: ButtonSize;
  token?: string;
}
