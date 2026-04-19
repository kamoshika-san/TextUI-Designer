import React from 'react';
import { createErrorGuidance, type ErrorInfo } from '../error-guidance';

interface ErrorPanelProps {
  error: ErrorInfo | string;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({ error }) => {
  const guidance = createErrorGuidance(error);

  if (typeof error === 'string') {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ color: 'var(--color-error, #ef4444)', marginBottom: 8 }}>{guidance.title}: {error}</div>
        <ul>
          {guidance.actionItems.map(item => <li key={item}>{item}</li>)}
        </ul>
        <div>
          {guidance.documentLinks.map(link => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>
              {link.label}
            </a>
          ))}
        </div>
        {guidance.technicalDetails && (
          <details style={{ marginTop: 12 }}>
            <summary>Show technical details</summary>
            <pre style={{ whiteSpace: 'pre-wrap' }}>{guidance.technicalDetails}</pre>
          </details>
        )}
      </div>
    );
  }

  if (error.type === 'simple') {
    return (
      <div style={{ padding: 24, backgroundColor: 'var(--color-error-bg, rgba(239,68,68,0.1))', border: '1px solid var(--color-error-border, rgba(239,68,68,0.3))', borderRadius: 8 }}>
        <div style={{ color: 'var(--color-error, #ef4444)', marginBottom: 8 }}>{error.message}</div>
        <div style={{ color: 'var(--color-text-dark, #475569)', fontWeight: 'medium', marginBottom: 6 }}>🛠 Next steps</div>
        <ul style={{ margin: '0 0 12px 0', paddingLeft: 20, color: 'var(--color-text-dark, #475569)' }}>
          {guidance.actionItems.map(item => <li key={item}>{item}</li>)}
        </ul>
        <div>
          {guidance.documentLinks.map(link => (
            <a key={link.href} href={link.href} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>
              {link.label}
            </a>
          ))}
        </div>
      </div>
    );
  }

  const details = error.details;
  if (!details) {
    return null;
  }

  const headerColor = error.type === 'parse'
    ? 'var(--color-error, #ef4444)'
    : 'var(--color-warning, #F59E0B)';
  const bgColor = error.type === 'parse'
    ? 'var(--color-error-bg, rgba(239,68,68,0.1))'
    : 'var(--color-warning-bg, rgba(245,158,11,0.1))';
  const borderColor = error.type === 'parse'
    ? 'var(--color-error-border, rgba(239,68,68,0.3))'
    : 'var(--color-warning-border, rgba(245,158,11,0.3))';
  const title = error.type === 'parse' ? '🚨 YAML syntax error' : '⚠️ Schema validation error';

  return (
    <div style={{ padding: 24, backgroundColor: bgColor, border: `1px solid ${borderColor}`, borderRadius: 8, maxWidth: '100%', overflow: 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ color: headerColor, margin: '0 0 8px 0', fontSize: '1.25rem', fontWeight: 'bold' }}>{title}</h3>
        <div style={{ color: 'var(--color-text-dark, #475569)', fontSize: '0.9rem', marginBottom: 8 }}>
          📁 File: <code style={{ backgroundColor: 'var(--color-surface-muted, rgba(75,85,99,0.2))', padding: '2px 4px', borderRadius: 4 }}>{details.fileName}</code>
        </div>
        <div style={{ color: 'var(--color-text-dark, #475569)', fontSize: '0.9rem' }}>📍 Location: line {details.lineNumber}, column {details.columnNumber}</div>
      </div>

      <div style={{ backgroundColor: 'var(--color-surface, rgba(107,114,128,0.25))', border: '1px solid var(--color-border-default, rgba(255,255,255,0.1))', borderRadius: 6, padding: 12, marginBottom: 16 }}>
        <div style={{ color: headerColor, fontWeight: 'medium', marginBottom: 8 }}>Details:</div>
        <div style={{ color: 'var(--color-text-dark, #475569)' }}>{details.message}</div>
      </div>

      {details.errorContext && (
        <div style={{ backgroundColor: 'var(--color-surface, rgba(107,114,128,0.25))', border: '1px solid var(--color-border-default, rgba(255,255,255,0.1))', borderRadius: 6, padding: 12, marginBottom: 16 }}>
          <div style={{ color: 'var(--color-text-dark, #475569)', fontWeight: 'medium', marginBottom: 8 }}>📋 Context:</div>
          <pre style={{ margin: 0, fontFamily: 'Consolas, Monaco, "Courier New", monospace', fontSize: '0.9rem', lineHeight: 1.5, backgroundColor: 'var(--color-surface-muted, rgba(75,85,99,0.2))', padding: 12, borderRadius: 4, overflow: 'auto', border: '1px solid var(--color-border-default, rgba(255,255,255,0.1))' }}>
            {details.errorContext}
          </pre>
        </div>
      )}

      {details.suggestions.length > 0 && (
        <div style={{ backgroundColor: 'var(--color-surface, rgba(107,114,128,0.25))', border: '1px solid var(--color-border-default, rgba(255,255,255,0.1))', borderRadius: 6, padding: 12, marginBottom: details.allErrors && details.allErrors.length > 1 ? 16 : 0 }}>
          <div style={{ color: 'var(--color-text-dark, #475569)', fontWeight: 'medium', marginBottom: 8 }}>💡 Suggestions:</div>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text-dark, #475569)' }}>
            {details.suggestions.map((suggestion, index) => (
              <li key={index} style={{ marginBottom: 4 }}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {details.allErrors && details.allErrors.length > 1 && (
        <div style={{ backgroundColor: 'var(--color-surface, rgba(107,114,128,0.25))', border: '1px solid var(--color-border-default, rgba(255,255,255,0.1))', borderRadius: 6, padding: 12 }}>
          <div style={{ color: 'var(--color-text-dark, #475569)', fontWeight: 'medium', marginBottom: 8 }}>📋 All issues:</div>
          {details.allErrors.map((err, index) => (
            <div key={index} style={{ marginBottom: 8, paddingLeft: 12, borderLeft: `3px solid ${borderColor}` }}>
              <div style={{ fontWeight: 'medium', color: headerColor }}>{err.path || 'root'}: {err.message}</div>
              {err.allowedValues && (
                <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary, #9ca3af)', marginTop: 4 }}>
                  Allowed values: {err.allowedValues.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <div style={{ color: 'var(--color-text-dark, #475569)', fontWeight: 'medium', marginBottom: 8 }}>🛠 Next steps</div>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--color-text-dark, #475569)' }}>
          {guidance.actionItems.map(item => <li key={item}>{item}</li>)}
        </ul>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ color: 'var(--color-text-dark, #475569)', fontWeight: 'medium', marginBottom: 8 }}>📚 Related docs</div>
        {guidance.documentLinks.map(link => (
          <a key={link.href} href={link.href} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>
            {link.label}
          </a>
        ))}
      </div>

      {guidance.technicalDetails && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', color: 'var(--color-text-secondary, #9ca3af)' }}>Technical details</summary>
          <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-dark, #475569)' }}>{guidance.technicalDetails}</pre>
        </details>
      )}
    </div>
  );
};
