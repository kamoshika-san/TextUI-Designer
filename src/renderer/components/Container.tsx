import React from 'react';
import { ContainerComponent } from '../types';

type Layout = 'vertical' | 'horizontal' | 'flex' | 'grid';

interface ContainerProps extends Omit<ContainerComponent, 'components'> {
  layout?: Layout;
  children?: React.ReactNode;
}

const layoutClasses: Record<Layout, string> = {
  vertical: 'textui-container flex flex-col space-y-4',
  horizontal: 'textui-container flex flex-row space-x-4',
  flex: 'textui-container flex flex-wrap gap-4',
  grid: 'textui-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
};

export const Container: React.FC<ContainerProps> = ({
  layout = 'vertical',
  width,
  flexGrow,
  children
}) => {
  const className = layoutClasses[layout];
  const hasFlexGrow = typeof flexGrow === 'number';

  const style = hasFlexGrow
    ? {
        flexGrow,
        flexShrink: 0,
        flexBasis: width ?? 0,
        ...(width ? { width } : {}),
      }
    : width
      ? { width }
      : undefined;

  return <div className={className} style={style}>{children || null}</div>;
};
