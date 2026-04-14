import React from 'react';
import { ButtonComponent } from '../../domain/dsl-types';

type ButtonKind = 'primary' | 'secondary' | 'submit';

interface ButtonProps extends ButtonComponent {
  kind?: ButtonKind;
  label?: string;
  icon?: string;
  iconPosition?: 'left' | 'right';
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
  icon,
  iconPosition = 'left',
  submit = false,
  disabled = false,
  size = 'md',
  onClick,
  action,
}) => {
  const className = [
    kindClasses[kind],
    sizeClasses[size]
  ].join(' ');

  // action.trigger がある場合は postMessage でナビゲーションイベントを発火する
  const handleClick = action?.trigger
    ? () => {
        window.parent.postMessage({ type: 'preview-navigate', trigger: action.trigger }, '*');
      }
    : onClick;

  return (
    <button
      type={submit ? 'submit' : 'button'}
      className={className}
      disabled={disabled}
      onClick={handleClick}
    >
      {icon && iconPosition === 'left' ? <span className="textui-button-icon" aria-hidden="true">{icon}</span> : null}
      {label ? <span className="textui-button-label">{label}</span> : null}
      {icon && iconPosition === 'right' ? <span className="textui-button-icon" aria-hidden="true">{icon}</span> : null}
    </button>
  );
}; 
