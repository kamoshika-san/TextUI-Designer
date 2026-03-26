import React from 'react';
import { ImageComponent } from '../domain/dsl-types';
import { tokenToPreviewInlineStyle } from '../token-inline-style-from-definition';

export const Image: React.FC<ImageComponent> = ({ src, alt, width, height, variant = 'default', token }) => {
  const tokenStyle = tokenToPreviewInlineStyle('Image', token);
  // 枠線色のみでは見えにくいためプレビューだけ solid 1px。エクスポートは border-color のみ。
  const style: React.CSSProperties = {
    width,
    height,
    ...(variant === 'avatar' ? { borderRadius: '50%' } : {}),
    ...tokenStyle,
    ...(token ? { borderStyle: 'solid', borderWidth: '1px' } : {})
  };

  return <img src={src} alt={alt ?? ''} style={style} className="textui-image" />;
};
