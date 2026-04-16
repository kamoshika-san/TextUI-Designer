import React from 'react';
import { ProgressComponent, ProgressVariant } from '../../domain/dsl-types';
import { tokenToPreviewInlineStyle } from '../token-inline-style-from-definition';

const variantClasses: Record<ProgressVariant, string> = {
  default: 'textui-progress-default',
  primary: 'textui-progress-primary',
  success: 'textui-progress-success',
  warning: 'textui-progress-warning',
  error: 'textui-progress-error'
};

const normalizeValue = (value: number): number => Math.min(100, Math.max(0, value));
const formatPercent = (value: number): number => Number(value.toFixed(1));

export const Progress: React.FC<ProgressComponent> = ({
  value,
  segments,
  label,
  showValue = true,
  variant = 'default',
  token
}) => {
  const hasSegments = Array.isArray(segments) && segments.length > 0;
  const isIndeterminate = value === undefined && !hasSegments;
  const normalizedValue = normalizeValue(value ?? 0);
  const totalValue = hasSegments
    ? segments.reduce((sum, segment) => sum + normalizeValue(segment.value), 0)
    : normalizedValue;
  const displayValue = formatPercent(Math.min(100, totalValue));

  return (
    <div className="textui-progress">
      {(label || (showValue && !isIndeterminate)) && (
        <div className="textui-progress-header">
          {label ? <span className="textui-progress-label">{label}</span> : <span />}
          {showValue && !isIndeterminate ? <span className="textui-progress-value">{displayValue}%</span> : null}
        </div>
      )}
      <div className="textui-progress-track">
        {hasSegments
          ? segments.map((segment, index) => {
            const segmentVariant = segment.variant ?? variant;
            const className = `textui-progress-fill ${variantClasses[segmentVariant]}`;
            const width = `${normalizeValue(segment.value)}%`;

            return (
              <div
                key={`${segment.label ?? 'segment'}-${index}`}
                className={className}
                style={{ width, ...tokenToPreviewInlineStyle('Progress', segment.token) }}
                title={segment.label}
              />
            );
          })
          : isIndeterminate
            ? (
              <div
                className={`textui-progress-fill ${variantClasses[variant]} is-indeterminate`}
                style={tokenToPreviewInlineStyle('Progress', token)}
              />
            )
            : (
              <div
                className={`textui-progress-fill ${variantClasses[variant]}`}
                style={{ width: `${normalizedValue}%`, ...tokenToPreviewInlineStyle('Progress', token) }}
              />
            )}
      </div>
    </div>
  );
};
