import React, { useState } from 'react';
import { InputComponent } from '../../domain/dsl-types';

interface InputProps extends InputComponent {
  label?: string;
  name?: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'multiline';
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  name = 'input',
  type = 'text',
  required = false,
  placeholder,
  disabled = false,
  multiline = false,
}) => {
  const [value, setValue] = useState('');
  const inputType = multiline ? 'multiline' : type;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!disabled) {
      setValue(e.target.value);
    }
  };
  
  if (inputType === 'multiline') {
    return (
      <div className="textui-input-wrapper">
        {label && (
          <label htmlFor={name} className="textui-text">
            {label}
          </label>
        )}
        <textarea
          id={name}
          name={name}
          value={value}
          required={required}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          className="textui-input"
          rows={4}
        />
      </div>
    );
  }

  return (
    <div className="textui-input-wrapper">
      {label && (
        <label htmlFor={name} className="textui-text">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={inputType}
        value={value}
        required={required}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        className="textui-input"
      />
    </div>
  );
}; 
