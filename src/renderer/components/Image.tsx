import React from 'react';
import { ImageComponent } from '../types';

export const Image: React.FC<ImageComponent> = ({ src, alt, width, height, token }) => {
  const style: React.CSSProperties = {
    width,
    height,
    ...(token ? { borderColor: token, borderStyle: 'solid', borderWidth: '1px' } : {})
  };

  return <img src={src} alt={alt ?? ''} style={style} className="textui-image" />;
};
