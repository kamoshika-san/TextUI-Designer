import React from 'react';

interface RadioOption {
  label: string;
  value: string;
}

interface RadioProps {
  label: string;
  name: string;
  options: RadioOption[];
}

export const Radio: React.FC<RadioProps> = ({ label, name, options }) => {
  return (
    <div className="textui-radio-group">
      <label className="block text-sm font-medium mb-2 textui-text">{label}</label>
      {options.map((option, index) => (
        <div key={index} className="textui-radio-option">
          <input
            type="radio"
            id={`${name}-${index}`}
            name={name}
            value={option.value}
          />
          <label htmlFor={`${name}-${index}`} className="textui-text">
            {option.label}
          </label>
        </div>
      ))}
    </div>
  );
}; 