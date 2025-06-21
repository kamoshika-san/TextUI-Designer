import React from 'react';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
}

export const Divider: React.FC<DividerProps> = ({ orientation = 'horizontal' }) => {
  const className = `textui-divider ${orientation}`;
  
  if (orientation === 'vertical') {
    return <div className={className} />;
  }
  
  return <hr className={className} />;
}; 