import React from 'react';
import { BadgeComponent, BadgeVariant } from '../domain/dsl-types';
import { tokenToPreviewInlineStyle } from '../token-inline-style-from-definition';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'textui-badge-default',
  primary: 'textui-badge-primary',
  success: 'textui-badge-success',
  warning: 'textui-badge-warning',
  error: 'textui-badge-error'
};

export const Badge: React.FC<BadgeComponent> = ({ label, variant = 'default', size = 'md', token }) => {
  const className = `textui-badge ${variantClasses[variant]} textui-badge-${size}`;

  return (
    <span className={className} style={tokenToPreviewInlineStyle('Badge', token)}>
      {label}
    </span>
  );
};
