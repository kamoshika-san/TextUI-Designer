import React from 'react';
import type { InputType } from '../types';

interface InputProps {
  label: string;
  name: string;
  type: InputType;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  name,
  type,
  required = false
}) => {
  const inputClasses = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {type === 'multiline' ? (
        <textarea
          id={name}
          name={name}
          className={inputClasses}
          rows={4}
          required={required}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          className={inputClasses}
          required={required}
        />
      )}
    </div>
  );
}; 