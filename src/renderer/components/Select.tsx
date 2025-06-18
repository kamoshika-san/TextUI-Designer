import React from 'react';
import type { SelectComponent } from '../types';

export const Select: React.FC<SelectComponent> = ({ name, options, selected }) => {
  return (
    <div className="mb-2">
      <select name={name} defaultValue={selected} className="border rounded px-2 py-1">
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}; 