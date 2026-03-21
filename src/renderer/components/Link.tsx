import React from 'react';
import { tokenToPreviewInlineStyle } from '../token-inline-style-from-definition';
import { LinkComponent } from '../types';

interface LinkProps extends LinkComponent {}

export const Link: React.FC<LinkProps> = ({ href, label, target, token }) => {
  const rel = target === '_blank' ? 'noopener noreferrer' : undefined;

  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className="textui-link"
      style={tokenToPreviewInlineStyle('Link', token)}
    >
      {label}
    </a>
  );
};
