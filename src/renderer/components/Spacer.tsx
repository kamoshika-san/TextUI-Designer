import React from 'react';
import type { SpacerComponent } from '../domain/dsl-types';

const sizeMap: Record<NonNullable<SpacerComponent['size']>, string> = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem'
};

export const Spacer: React.FC<SpacerComponent> = ({
  axis = 'vertical',
  size = 'md',
  width,
  height,
  token
}) => {
  const fallbackSize = token || sizeMap[size];
  const resolvedWidth = width || (axis === 'horizontal' ? fallbackSize : '100%');
  const resolvedHeight = height || (axis === 'horizontal' ? '1px' : fallbackSize);

  return (
    <div
      className="textui-spacer"
      aria-hidden="true"
      style={{
        width: resolvedWidth,
        height: resolvedHeight,
        flexShrink: 0
      }}
    />
  );
};
