import React from 'react';

type TextVariant = 'h1' | 'h2' | 'h3' | 'p' | 'small' | 'caption';

interface TextProps {
  variant: TextVariant;
  value: string;
}

const variantClasses: Record<TextVariant, string> = {
  h1: 'textui-text h1',
  h2: 'textui-text h2',
  h3: 'textui-text h3',
  p: 'textui-text p',
  small: 'textui-text small',
  caption: 'textui-text caption',
};

export const Text: React.FC<TextProps> = ({ variant, value }) => {
  const Component = variant.startsWith('h') ? variant : 'p';
  const className = variantClasses[variant];

  return React.createElement(Component, { className }, value);
}; 