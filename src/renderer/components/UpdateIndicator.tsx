import React from 'react';

interface UpdateIndicatorProps {
  isUpdating: boolean;
}

export const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({ isUpdating }) => {
  if (!isUpdating) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      role="status"
      style={{
        position: 'fixed',
        right: '1rem',
        bottom: '1rem',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.65rem',
        padding: '0.75rem 0.95rem',
        borderRadius: '9999px',
        border: '1px solid rgba(96, 165, 250, 0.32)',
        background: 'rgba(15, 23, 42, 0.88)',
        color: '#eff6ff',
        boxShadow: '0 14px 28px rgba(15, 23, 42, 0.22)',
        backdropFilter: 'blur(10px)',
        zIndex: 30
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '0.8rem',
          height: '0.8rem',
          borderRadius: '9999px',
          border: '2px solid rgba(191, 219, 254, 0.35)',
          borderTopColor: '#93c5fd',
          animation: 'textui-update-indicator-spin 0.8s linear infinite'
        }}
      />
      <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.01em' }}>
        Preview updating...
      </span>
    </div>
  );
};
