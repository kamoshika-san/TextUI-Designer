import React from 'react';
import type { BreadcrumbComponent } from '../types';

interface BreadcrumbProps extends BreadcrumbComponent {}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ items = [], separator = '/', token }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav className="textui-breadcrumb" aria-label="Breadcrumb" style={token ? { color: token } : undefined}>
      <ol className="textui-breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const rel = item.target === '_blank' ? 'noopener noreferrer' : undefined;

          return (
            <li key={`${item.label}-${index}`} className="textui-breadcrumb-item">
              {item.href && !isLast ? (
                <a className="textui-breadcrumb-link" href={item.href} target={item.target} rel={rel}>
                  {item.label}
                </a>
              ) : (
                <span className={isLast ? 'textui-breadcrumb-current' : 'textui-breadcrumb-label'}>{item.label}</span>
              )}
              {!isLast ? <span className="textui-breadcrumb-separator" aria-hidden="true">{separator}</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
