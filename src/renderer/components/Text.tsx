import React from 'react';
import { TextComponent } from '../types';

type TextVariant = 'h1' | 'h2' | 'h3' | 'p' | 'small' | 'caption';

interface TextProps extends TextComponent {
  variant?: TextVariant;
  value: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'text-gray-300' | 'text-gray-400' | 'text-gray-500' | 'text-gray-600' | 'text-gray-700' | 'text-gray-900';
}

const variantClasses: Record<TextVariant, string> = {
  h1: 'textui-text h1',
  h2: 'textui-text h2',
  h3: 'textui-text h3',
  p: 'textui-text p',
  small: 'textui-text small',
  caption: 'textui-text caption',
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

export const Text: React.FC<TextProps> = ({ 
  variant = 'p', 
  value, 
  size, 
  weight, 
  color 
}) => {
  const Component = variant.startsWith('h') ? variant : 'p';
  
  const className = [
    variantClasses[variant],
    size && sizeClasses[size],
    weight && weightClasses[weight],
    color
  ].filter(Boolean).join(' ');

  return React.createElement(Component, { className }, value);
}; 