import React from 'react';
import type { RadioComponent } from '../types';

export const Radio: React.FC<RadioComponent> = ({ name, options, selected }) => {
  return (
    <div className="mb-2">
      {options.map((opt, i) => (
        <label key={i} className="mr-4 inline-flex items-center">
          <input
            type="radio"
            name={name}
            value={opt.value}
            defaultChecked={selected === opt.value}
            className="mr-1"
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}; 