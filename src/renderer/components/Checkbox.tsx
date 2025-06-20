import React from 'react';

interface CheckboxProps {
  label: string;
  name: string;
  required?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name,
  required = false,
}) => {
  return (
    <div className="flex items-center mb-4">
      <input
        type="checkbox"
        id={name}
        name={name}
        required={required}
        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded bg-gray-800"
      />
      <label htmlFor={name} className="ml-2 block text-sm text-gray-400">
        {label}
      </label>
    </div>
  );
}; 