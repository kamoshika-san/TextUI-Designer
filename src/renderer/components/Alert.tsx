import React from 'react';
import { AlertComponent } from '../types';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps extends AlertComponent {
  variant?: AlertVariant;
  message: string;
  title?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'textui-alert info',
  success: 'textui-alert success',
  warning: 'textui-alert warning',
  error: 'textui-alert error',
};

export const Alert: React.FC<AlertProps> = ({ 
  variant = 'info', 
  message,
  title 
}) => {
  return (
    <div className={variantClasses[variant]}>
      {title && <div className="textui-alert-title">{title}</div>}
      <div className="textui-alert-message">{message}</div>
    </div>
  );
}; 