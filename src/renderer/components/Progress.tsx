import React from 'react';
import { ProgressComponent, ProgressVariant } from '../types';

const variantClasses: Record<ProgressVariant, string> = {
  default: 'textui-progress-default',
  primary: 'textui-progress-primary',
  success: 'textui-progress-success',
  warning: 'textui-progress-warning',
  error: 'textui-progress-error'
};

export const Progress: React.FC<ProgressComponent> = ({
  value,
  label,
  showValue = true,
  variant = 'default',
  token
}) => {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const className = `textui-progress-fill ${variantClasses[variant]}`;

  return (
    <div className="textui-progress">
      {(label || showValue) && (
        <div className="textui-progress-header">
          {label ? <span className="textui-progress-label">{label}</span> : <span />}
          {showValue ? <span className="textui-progress-value">{normalizedValue}%</span> : null}
        </div>
      )}
      <div className="textui-progress-track">
        <div
          className={className}
          style={{ width: `${normalizedValue}%`, ...(token ? { backgroundColor: token } : {}) }}
        />
      </div>
    </div>
  );
};
