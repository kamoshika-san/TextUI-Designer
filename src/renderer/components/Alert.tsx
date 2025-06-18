import React from 'react';
import type { AlertComponent } from '../types';

const variantStyles: Record<AlertComponent['variant'], string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  error: 'bg-red-50 border-red-200 text-red-800',
};

export const Alert: React.FC<AlertComponent> = ({ variant, message }) => {
  return (
    <div className={`p-4 rounded-lg mb-4 border ${variantStyles[variant]}`}>
      {message}
    </div>
  );
}; 