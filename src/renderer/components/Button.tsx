import React from 'react';
import { ButtonComponent } from '../types';
import { BaseComponent, type BaseComponentProps } from './BaseComponent';

type ButtonKind = 'primary' | 'secondary' | 'submit';

interface ButtonProps extends ButtonComponent, BaseComponentProps {
  kind?: ButtonKind;
  label: string;
  submit?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

const kindClasses: Record<ButtonKind, string> = {
  primary: 'primary',
  secondary: 'secondary',
  submit: 'submit',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

export class Button extends BaseComponent<ButtonProps> {
  protected defaultClassName = 'textui-button';

  render() {
    const { kind = 'primary', label, submit = false, disabled = false, size = 'md', onClick } = this.props;

    const className = [
      this.getMergedClassName(),
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
  }
}
