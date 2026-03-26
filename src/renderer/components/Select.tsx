import React, { useMemo, useState } from 'react';
import { SelectComponent, SelectOption } from '../domain/dsl-types';

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
  const initialSelectedValues = useMemo(
    () => options.filter(option => option.selected).map(option => option.value),
    [options]
  );

  const [selectedValue, setSelectedValue] = useState<string | string[]>(
    multiple ? initialSelectedValues : (initialSelectedValues[0] ?? '')
  );

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (disabled) {
      return;
    }

    if (multiple) {
      setSelectedValue(Array.from(e.target.selectedOptions, (option) => option.value));
      return;
    }

    setSelectedValue(e.target.value);
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
