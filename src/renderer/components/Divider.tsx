import React from 'react';
import type { DividerComponent } from '../types';

export const Divider: React.FC<DividerComponent> = ({ label }) => {
  return (
    <div className="flex items-center my-4">
      <div className="flex-grow border-t border-gray-300" />
      {label && <span className="mx-2 text-gray-500 text-sm">{label}</span>}
      <div className="flex-grow border-t border-gray-300" />
    </div>
  );
}; 