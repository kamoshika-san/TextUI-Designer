import React from 'react';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  variant: AlertVariant;
  message: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'textui-alert info',
  success: 'textui-alert success',
  warning: 'textui-alert warning',
  error: 'textui-alert error',
};

export const Alert: React.FC<AlertProps> = ({ variant, message }) => {
  return (
    <div className={variantClasses[variant]}>
      {message}
    </div>
  );
}; 