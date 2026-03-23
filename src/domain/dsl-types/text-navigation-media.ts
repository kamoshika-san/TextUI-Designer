/**
 * Canonical DSL types for text, navigation, and media-facing components.
 * Sprint 2 keeps these nearby read-oriented contracts in one operational file.
 */

// Text / display
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
  tokenSlots?: string[];
}

// Navigation
export interface LinkComponent {
  href: string;
  label: string;
  target?: string;
  token?: string;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  target?: string;
}

export interface BreadcrumbComponent {
  items: BreadcrumbItem[];
  separator?: string;
  token?: string;
}

// Display feedback / media
export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

export interface BadgeComponent {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  token?: string;
}

export interface ImageComponent {
  src: string;
  alt?: string;
  width?: string;
  height?: string;
  variant?: 'default' | 'avatar';
  token?: string;
}

export interface IconComponent {
  name: string;
  label?: string;
  token?: string;
}

export type ProgressVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

export interface ProgressSegment {
  value: number;
  label?: string;
  variant?: ProgressVariant;
  token?: string;
}

export interface ProgressComponent {
  value?: number;
  segments?: ProgressSegment[];
  label?: string;
  showValue?: boolean;
  variant?: ProgressVariant;
  token?: string;
}
