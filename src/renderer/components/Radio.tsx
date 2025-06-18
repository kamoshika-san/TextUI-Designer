import React from 'react';
import type { RadioComponent } from '../types';

export const Radio: React.FC<RadioComponent> = ({ label, name, options }) => {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <div className="space-y-2">
        {options.map((opt, i) => (
          <div key={i} className="flex items-center">
            <input
              type="radio"
              name={name}
              value={opt.value}
              className="mr-2"
            />
            <label className="text-sm text-gray-700">{opt.label}</label>
          </div>
        ))}
      </div>
    </div>
  );
}; 