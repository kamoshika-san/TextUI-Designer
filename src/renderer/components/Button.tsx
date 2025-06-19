import React from 'react';

type ButtonKind = 'primary' | 'secondary' | 'submit';

interface ButtonProps {
  kind: ButtonKind;
  label: string;
  submit?: boolean;
  onClick?: () => void;
}

const kindClasses: Record<ButtonKind, string> = {
  primary: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-blue-600 hover:bg-blue-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
  secondary: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-gray-700 hover:bg-gray-600 text-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500',
  submit: 'inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm bg-green-600 hover:bg-green-700 text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
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