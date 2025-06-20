import React from 'react';

interface InputProps {
  label?: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'multiline';
  required?: boolean;
  placeholder?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  name,
  type = 'text',
  required = false,
  placeholder,
}) => {
  if (type === 'multiline') {
    return (
      <div className="mb-4">
        {label && (
          <label htmlFor={name} className="block text-sm font-medium text-gray-400 mb-2">
            {label}
          </label>
        )}
        <textarea
          id={name}
          name={name}
          required={required}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={4}
        />
      </div>
    );
  }

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-400 mb-2">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md shadow-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}; 