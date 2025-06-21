import React, { useState } from 'react';
import { SelectComponent, SelectOption } from '../types';

interface SelectProps extends SelectComponent {
  label?: string;
  name?: string;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  name = 'select',
  options = [],
  placeholder,
  disabled = false,
  multiple = false,
}) => {
  const [selectedValue, setSelectedValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!disabled) {
      setSelectedValue(e.target.value);
    }
  };

  return (
    <div className="textui-select">
      {label && (
        <label htmlFor={name} className="textui-text">
          {label}
        </label>
      )}
      <select
        id={name}
        name={name}
        multiple={multiple}
        disabled={disabled}
        value={selectedValue}
        onChange={handleChange}
      >
        {placeholder && !multiple && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}; 