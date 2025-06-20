import React from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant: AlertVariant;
  message: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'p-4 border rounded-md bg-blue-900 border-blue-700 text-blue-200',
  success: 'p-4 border rounded-md bg-green-900 border-green-700 text-green-200',
  warning: 'p-4 border rounded-md bg-yellow-900 border-yellow-700 text-yellow-200',
  error: 'p-4 border rounded-md bg-red-900 border-red-700 text-red-200',
};

export const Alert: React.FC<AlertProps> = ({ variant, message }) => {
  return (
    <div className={variantClasses[variant]}>
      {message}
    </div>
  );
}; 