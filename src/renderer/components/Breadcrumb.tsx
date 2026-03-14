import React from 'react';
import type { BreadcrumbComponent } from '../types';

interface BreadcrumbProps extends BreadcrumbComponent {}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items = [], separator = '/', token }) => {
  const colorStyle = token ? { color: token } : undefined;

  return (
    <nav className="textui-breadcrumb" aria-label="Breadcrumb" style={colorStyle}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const rel = item.target === '_blank' ? 'noopener noreferrer' : undefined;
        const key = `${item.label}-${index}`;

        return (
          <span key={key} className="textui-breadcrumb-item">
            {item.href && !isLast ? (
              <a href={item.href} target={item.target} rel={rel} className="textui-breadcrumb-link">
                {item.label}
              </a>
            ) : (
              <span className={isLast ? 'textui-breadcrumb-current' : 'textui-breadcrumb-label'}>
                {item.label}
              </span>
            )}
            {!isLast ? <span className="textui-breadcrumb-separator" aria-hidden="true">{separator}</span> : null}
          </span>
        );
      })}
    </nav>
  );
};
