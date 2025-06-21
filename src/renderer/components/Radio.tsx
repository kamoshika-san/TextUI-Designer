import React, { useState } from 'react';
import { RadioComponent, RadioOption } from '../types';

interface RadioProps extends RadioComponent {
  label?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean;
  options?: RadioOption[];
}

export const Radio: React.FC<RadioProps> = ({ 
  label, 
  name = 'radio', 
  value: initialValue,
  checked: initialChecked = false,
  disabled = false,
  options = [] 
}) => {
  const [selectedValue, setSelectedValue] = useState(initialValue || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      setSelectedValue(e.target.value);
    }
  };

  return (
    <div className="textui-radio-group">
      {label && (
        <label className="block text-sm font-medium mb-2 textui-text">{label}</label>
      )}
      {options.map((option, index) => (
        <div key={index} className="textui-radio-option">
          <input
            type="radio"
            id={`${name}-${index}`}
            name={name}
            value={option.value}
            checked={selectedValue === option.value}
            disabled={disabled}
            onChange={handleChange}
          />
          <label htmlFor={`${name}-${index}`} className="textui-text">
            {option.label}
          </label>
        </div>
      ))}
    </div>
  );
}; 