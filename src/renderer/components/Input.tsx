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
          <label htmlFor={name} className="block text-sm font-medium mb-2 textui-text">
            {label}
          </label>
        )}
        <textarea
          id={name}
          name={name}
          required={required}
          placeholder={placeholder}
          className="textui-input"
          rows={4}
        />
      </div>
    );
  }

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={name} className="block text-sm font-medium mb-2 textui-text">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="textui-input"
      />
    </div>
  );
}; 