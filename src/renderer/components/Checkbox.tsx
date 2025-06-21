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
        className="textui-checkbox"
      />
      <label htmlFor={name} className="ml-2 block text-sm textui-text">
        {label}
      </label>
    </div>
  );
}; 