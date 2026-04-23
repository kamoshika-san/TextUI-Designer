import React from 'react';

export const PREVIEW_SHELL_BODY_CLASS = 'textui-preview-shell-body';
export const PREVIEW_SHELL_ROOT_CLASS = 'textui-preview-shell-root';
export const PREVIEW_SHELL_FRAME_CLASS = 'textui-preview-root';
export const PREVIEW_SHELL_HIDE_JUMP_HOVER_CLASS = 'textui-preview-root-hide-jump-hover';

export const PREVIEW_SHELL_FRAME_STYLE: React.CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: '100%',
  padding: 24,
  position: 'relative'
};

type PreviewShellCoreProps = {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function PreviewShellCore({ children, className, style }: PreviewShellCoreProps): React.JSX.Element {
  const mergedClassName = className
    ? className.includes(PREVIEW_SHELL_FRAME_CLASS)
      ? className
      : `${PREVIEW_SHELL_FRAME_CLASS} ${className}`
    : PREVIEW_SHELL_FRAME_CLASS;
  return (
    <div
      className={mergedClassName}
      style={{ ...PREVIEW_SHELL_FRAME_STYLE, ...style }}
    >
      {children}
    </div>
  );
}

export function getPreviewShellClassName(showJumpToDslHoverIndicator: boolean): string {
  return showJumpToDslHoverIndicator
    ? PREVIEW_SHELL_FRAME_CLASS
    : `${PREVIEW_SHELL_FRAME_CLASS} ${PREVIEW_SHELL_HIDE_JUMP_HOVER_CLASS}`;
}

export function wrapWithPreviewShellDocument(componentCode: string): string {
  return `  <div id="root" class="${PREVIEW_SHELL_ROOT_CLASS}">\n${componentCode}\n  </div>`;
}
