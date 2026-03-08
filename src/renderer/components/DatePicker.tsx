import React, { useState } from 'react';
import { DatePickerComponent } from '../types';

interface DatePickerProps extends DatePickerComponent {
  label?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  value?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  name = 'date',
  required = false,
  disabled = false,
  min,
  max,
  value = '',
}) => {
  const [selectedDate, setSelectedDate] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      setSelectedDate(e.target.value);
    }
  };

  return (
    <div className="textui-datepicker">
      {label && (
        <label htmlFor={name} className="textui-text">
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type="date"
        value={selectedDate}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        onChange={handleChange}
        className="textui-input"
      />
    </div>
  );
};
