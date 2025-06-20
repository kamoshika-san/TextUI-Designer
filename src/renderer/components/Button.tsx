import React from 'react';

type ButtonKind = 'primary' | 'secondary' | 'submit';

interface ButtonProps {
  kind: ButtonKind;
  label: string;
  submit?: boolean;
  onClick?: () => void;
}

const kindClasses: Record<ButtonKind, string> = {
  primary: 'textui-button primary',
  secondary: 'textui-button secondary',
  submit: 'textui-button submit',
};

export const Button: React.FC<ButtonProps> = ({
  kind,
  label,
  submit = false,
  onClick,
}) => {
  const className = kindClasses[kind];

  return (
    <button
      type={submit ? 'submit' : 'button'}
      className={className}
      onClick={onClick}
    >
      {label}
    </button>
  );
}; 