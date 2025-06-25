import React from 'react';
import { DividerComponent } from '../types';
import { BaseComponent, type BaseComponentProps } from './BaseComponent';

interface DividerProps extends DividerComponent, BaseComponentProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
}

const spacingClasses: Record<string, string> = {
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-8',
};

export class Divider extends BaseComponent<DividerProps> {
  protected defaultClassName = 'textui-divider';

  render() {
    const { orientation = 'horizontal', spacing = 'md' } = this.props;
    const className = [
      this.getMergedClassName(),
      orientation,
      spacingClasses[spacing]
    ].join(' ');

    if (orientation === 'vertical') {
      return <div className={className} />;
    }

    return <hr className={className} />;
  }
}
