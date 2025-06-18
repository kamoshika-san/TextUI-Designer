import React from 'react';

type TextVariant = 'h1' | 'h2' | 'h3' | 'p' | 'small' | 'caption';

interface TextProps {
  variant: TextVariant;
  value: string;
}

const variantClasses: Record<TextVariant, string> = {
  h1: 'text-4xl font-bold mb-4',
  h2: 'text-3xl font-semibold mb-3',
  h3: 'text-2xl font-medium mb-2',
  p: 'text-base mb-2',
  small: 'text-sm text-gray-600',
  caption: 'text-xs text-gray-500',
};

export const Text: React.FC<TextProps> = ({ variant, value }) => {
  const Component = variant.startsWith('h') ? variant : 'p';
  const className = variantClasses[variant];

  return React.createElement(Component, { className }, value);
}; 