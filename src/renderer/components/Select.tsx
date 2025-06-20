import React from 'react';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label: string;
  name: string;
  options: SelectOption[];
  multiple?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  name,
  options,
  multiple = false,
}) => {
  return (
    <div className="textui-select">
      <label htmlFor={name} className="textui-text">
        {label}
      </label>
      <select
        id={name}
        name={name}
        multiple={multiple}
      >
        {options.map((option, index) => (
          <option key={index} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}; 