import React from 'react';

interface RadioOption {
  label: string;
  value: string;
}

interface RadioProps {
  label: string;
  name: string;
  options: RadioOption[];
}

export const Radio: React.FC<RadioProps> = ({ label, name, options }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      {options.map((option, index) => (
        <div key={index} className="flex items-center mb-2">
          <input
            type="radio"
            id={`${name}-${index}`}
            name={name}
            value={option.value}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 bg-gray-800"
          />
          <label htmlFor={`${name}-${index}`} className="ml-2 block text-sm text-gray-400">
            {option.label}
          </label>
        </div>
      ))}
    </div>
  );
}; 