import React from 'react';
import { ContainerComponent } from '../types';
import { BaseComponent, type BaseComponentProps } from './BaseComponent';

type Layout = 'vertical' | 'horizontal' | 'flex' | 'grid';

interface ContainerProps extends Omit<ContainerComponent, 'components'>, BaseComponentProps {
  layout?: Layout;
  children: React.ReactNode;
}

const layoutClasses: Record<Layout, string> = {
  vertical: 'flex flex-col space-y-4',
  horizontal: 'flex flex-row space-x-4',
  flex: 'flex flex-wrap gap-4',
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
};

export class Container extends BaseComponent<ContainerProps> {
  protected defaultClassName = 'textui-container';

  render() {
    const { layout = 'vertical', children } = this.props;
    const className = [
      this.getMergedClassName(),
      layoutClasses[layout]
    ].join(' ');

    return <div className={className}>{children}</div>;
  }
}
