import React from 'react';
import { ButtonComponent } from '../types';

type ButtonKind = 'primary' | 'secondary' | 'submit';

interface ButtonProps extends ButtonComponent {
  kind?: ButtonKind;
  label: string;
  submit?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const kindClasses: Record<ButtonKind, string> = {
  primary: 'textui-button primary',
  secondary: 'textui-button secondary',
  submit: 'textui-button submit',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export const Button: React.FC<ButtonProps> = ({
  kind = 'primary',
  label,
  submit = false,
  disabled = false,
  size = 'md',
  onClick,
}) => {
  const className = [
    kindClasses[kind],
    sizeClasses[size]
  ].join(' ');

  return (
    <button
      type={submit ? 'submit' : 'button'}
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {label}
    </button>
  );
}; 