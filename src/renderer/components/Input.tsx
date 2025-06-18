import React from 'react';

type InputType = 'text' | 'email' | 'password' | 'number';

interface InputProps {
  label: string;
  name: string;
  type: InputType;
  required?: boolean;
  multiline?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  name,
  type,
  required = false,
  multiline = false,
}) => {
  const inputClasses = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="mb-4">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {multiline ? (
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