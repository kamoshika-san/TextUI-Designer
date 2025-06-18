import React from 'react';

type LayoutType = 'flex' | 'grid' | 'vertical' | 'horizontal';

interface ContainerProps {
  layout: LayoutType;
  children: React.ReactNode;
  className?: string;
}

const layoutClasses: Record<LayoutType, string> = {
  flex: 'flex flex-wrap',
  grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  vertical: 'flex flex-col space-y-4',
  horizontal: 'flex flex-row space-x-4',
};

export const Container: React.FC<ContainerProps> = ({
  layout,
  children,
  className = '',
}) => {
  const baseClasses = 'p-4';
  const containerClasses = `${baseClasses} ${layoutClasses[layout]} ${className}`;

  return <div className={containerClasses}>{children}</div>;
}; 