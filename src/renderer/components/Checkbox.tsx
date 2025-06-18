import React from 'react';
import type { CheckboxComponent } from '../types';

export const Checkbox: React.FC<CheckboxComponent> = ({ label, name }) => {
  return (
    <div className="mb-2 flex items-center">
      <input type="checkbox" id={name} name={name} className="mr-2" />
      <label htmlFor={name} className="text-sm">{label}</label>
    </div>
  );
}; 