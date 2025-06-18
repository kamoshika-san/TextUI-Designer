import React from 'react';
import type { DividerComponent } from '../types';

export const Divider: React.FC<DividerComponent> = ({ orientation = 'horizontal' }) => {
  if (orientation === 'vertical') {
    return <div className="border-l border-gray-200 mx-4" />;
  }
  
  return <div className="border-t border-gray-200 my-4" />;
}; 