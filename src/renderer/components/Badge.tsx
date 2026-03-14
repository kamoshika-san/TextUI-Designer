import React from 'react';
import { BadgeComponent, BadgeVariant } from '../types';

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
    <span className={className} style={token ? { backgroundColor: token } : undefined}>
      {label}
    </span>
  );
};
