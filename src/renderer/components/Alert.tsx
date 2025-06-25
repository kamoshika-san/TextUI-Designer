import React from 'react';
import { AlertComponent } from '../types';
import { BaseComponent, type BaseComponentProps } from './BaseComponent';

type AlertVariant = 'info' | 'success' | 'warning' | 'error';

interface AlertProps extends AlertComponent, BaseComponentProps {
  variant?: AlertVariant;
  message: string;
  title?: string;
}

const variantClasses: Record<AlertVariant, string> = {
  info: 'info',
  success: 'success',
  warning: 'warning',
  error: 'error',
};

export class Alert extends BaseComponent<AlertProps> {
  protected defaultClassName = 'textui-alert';

  render() {
    const { variant = 'info', message, title } = this.props;

    const className = [
      this.getMergedClassName(),
      variantClasses[variant]
    ].join(' ');

    return (
      <div className={className}>
        {title && <div className="textui-alert-title">{title}</div>}
        <div className="textui-alert-message">{message}</div>
      </div>
    );
  }
}
