import React from 'react';

export interface BaseComponentProps {
  defaultClassName: string;
  className?: string;
  as?: React.ElementType;
  [key: string]: any;
}

export function mergeClasses(defaultClass: string, customClass?: string): string {
  return customClass ? `${defaultClass} ${customClass}` : defaultClass;
}

export const BaseComponent: React.FC<BaseComponentProps> = ({
  defaultClassName,
  className,
  as: Component = 'div',
  ...rest
}) => {
  const merged = mergeClasses(defaultClassName, className);
  return <Component className={merged} {...rest} />;
};
