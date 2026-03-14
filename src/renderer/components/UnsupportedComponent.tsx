import React from 'react';

export interface UnsupportedComponentProps {
  componentName: string;
  props?: Record<string, unknown>;
}

/**
 * レジストリに未登録のコンポーネント用のプレースホルダー表示。
 * コンポーネント名と主要プロパティを表示し、DSL の意図を把握しやすくする。
 */
export const UnsupportedComponent: React.FC<UnsupportedComponentProps> = ({
  componentName,
  props: rawProps = {}
}) => {
  const props = rawProps && typeof rawProps === 'object' ? rawProps : {};
  const keys = Object.keys(props).filter(k => k !== '__renderContext');
  const summary = keys.length === 0
    ? null
    : keys.slice(0, 5).map(k => `${k}=${formatPropValue(props[k])}`).join(', ') + (keys.length > 5 ? '…' : '');

  return (
    <div className="textui-unsupported" role="status" aria-label={`未対応コンポーネント: ${componentName}`}>
      <span className="textui-unsupported-label">未対応: {componentName}</span>
      {summary && <span className="textui-unsupported-props">{summary}</span>}
    </div>
  );
};

function formatPropValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v.length > 20 ? `${v.slice(0, 20)}…` : v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (Array.isArray(v)) return `[${v.length}]`;
  if (typeof v === 'object') return '{…}';
  return String(v);
}
