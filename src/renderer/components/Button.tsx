import React from 'react';

type ButtonKind = 'primary' | 'secondary' | 'submit';

interface ButtonProps {
  kind: ButtonKind;
  label: string;
  submit?: boolean;
  onClick?: () => void;
}

const kindClasses: Record<ButtonKind, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
  submit: 'bg-green-600 hover:bg-green-700 text-white',
};

export const Button: React.FC<ButtonProps> = ({
  kind,
  label,
  submit = false,
  onClick,
}) => {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors duration-200';
  const className = `${baseClasses} ${kindClasses[kind]}`;

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