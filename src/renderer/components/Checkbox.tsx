import React, { useState } from 'react';
import { CheckboxComponent } from '../types';

interface CheckboxProps extends CheckboxComponent {
  label: string;
  name?: string;
  checked?: boolean;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name = 'checkbox',
  checked: initialChecked = false,
  disabled = false,
}) => {
  const [isChecked, setIsChecked] = useState(initialChecked);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      setIsChecked(e.target.checked);
    }
  };

  return (
    <div className="flex items-center mb-4">
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={isChecked}
        disabled={disabled}
        onChange={handleChange}
        className="textui-checkbox"
      />
      <label htmlFor={name} className="ml-2 block text-sm textui-text">
        {label}
      </label>
    </div>
  );
}; 