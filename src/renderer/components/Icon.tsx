import React from 'react';
import { IconComponent } from '../../domain/dsl-types';

export const Icon: React.FC<IconComponent> = ({ name, label }) => (
  <span className="textui-icon" role="img" aria-label={label ?? name}>
    <span className="textui-icon-glyph">{name}</span>
    {label ? <span className="textui-icon-label">{label}</span> : null}
  </span>
);
