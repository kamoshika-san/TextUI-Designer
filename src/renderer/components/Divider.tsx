import React from 'react';
import { DividerComponent } from '../types';

interface DividerProps extends DividerComponent {
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
}

const spacingClasses: Record<string, string> = {
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-8',
};

export const Divider: React.FC<DividerProps> = ({ 
  orientation = 'horizontal',
  spacing = 'md'
}) => {
  const className = [
    `textui-divider ${orientation}`,
    spacingClasses[spacing]
  ].join(' ');
  
  if (orientation === 'vertical') {
    return <div className={className} />;
  }
  
  return <hr className={className} />;
}; 