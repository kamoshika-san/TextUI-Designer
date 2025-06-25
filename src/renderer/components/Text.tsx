import React from 'react';
import { TextComponent } from '../types';
import { BaseComponent, type BaseComponentProps } from './BaseComponent';

type TextVariant = 'h1' | 'h2' | 'h3' | 'p' | 'small' | 'caption';

interface TextProps extends TextComponent, BaseComponentProps {
  variant?: TextVariant;
  value: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'text-gray-300' | 'text-gray-400' | 'text-gray-500' | 'text-gray-600' | 'text-gray-700' | 'text-gray-900';
}

const variantClasses: Record<TextVariant, string> = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  p: 'p',
  small: 'small',
  caption: 'caption',
};

const sizeClasses: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
};

const weightClasses: Record<string, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

export class Text extends BaseComponent<TextProps> {
  protected defaultClassName = 'textui-text';

  render() {
    const { variant = 'p', value, size, weight, color } = this.props;
    const Component = variant.startsWith('h') ? variant : 'p';

    const className = [
      this.getMergedClassName(),
      variantClasses[variant],
      size && sizeClasses[size],
      weight && weightClasses[weight],
      color
    ].filter(Boolean).join(' ');

    return React.createElement(Component, { className }, value);
  }
}
