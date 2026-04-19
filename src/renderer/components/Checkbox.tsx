import React, { useState } from 'react';
import { CheckboxComponent } from '../../domain/dsl-types';

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
    <div className="textui-checkbox-wrapper">
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={isChecked}
        disabled={disabled}
        onChange={handleChange}
        className={['textui-checkbox', disabled ? 'opacity-50 cursor-not-allowed' : ''].filter(Boolean).join(' ')}
      />
      <label htmlFor={name} className="textui-checkbox-label textui-text">
        {label}
      </label>
    </div>
  );
}; 
