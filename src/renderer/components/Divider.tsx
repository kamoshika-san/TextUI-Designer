import React from 'react';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
}

export const Divider: React.FC<DividerProps> = ({ orientation = 'horizontal' }) => {
  if (orientation === 'vertical') {
    return <div className="inline-block w-px h-6 bg-gray-700 mx-4" />;
  }
  
  return <hr className="border-gray-700 my-4" />;
}; 