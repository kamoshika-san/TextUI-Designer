import React from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label: string;
  name: string;
  options: SelectOption[];
  multiple?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  name,
  options,
  multiple = false,
}) => {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-400 mb-2">
        {label}
      </label>
      <select
        id={name}
        name={name}
        multiple={multiple}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {options.map((option, index) => (
          <option key={index} value={option.value} className="bg-gray-800 text-gray-400">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}; 