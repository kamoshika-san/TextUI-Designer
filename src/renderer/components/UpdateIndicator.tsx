import React from 'react';
import type { PreviewUpdateStatus } from '../preview-update-status';

interface UpdateIndicatorProps {
  status: PreviewUpdateStatus;
}

export const UpdateIndicator: React.FC<UpdateIndicatorProps> = ({ status }) => {
  if (status === 'idle') {
    return null;
  }

  const isUpdating = status === 'updating';
  const isDone = status === 'done';

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
        border: isDone ? '1px solid rgba(74, 222, 128, 0.35)' : '1px solid rgba(96, 165, 250, 0.32)',
        background: isDone ? 'rgba(20, 83, 45, 0.92)' : 'rgba(15, 23, 42, 0.88)',
        color: '#eff6ff',
        boxShadow: '0 14px 28px rgba(15, 23, 42, 0.22)',
        backdropFilter: 'blur(10px)',
        zIndex: 30,
        animation: isDone ? 'textui-update-indicator-fadeout 1.2s ease forwards' : undefined
      }}
    >
      {isUpdating ? (
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
      ) : (
        <span
          aria-hidden="true"
          style={{
            fontSize: '0.85rem',
            fontWeight: 800,
            color: '#bbf7d0'
          }}
        >
          ✓
        </span>
      )}
      <span style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.01em' }}>
        {isUpdating ? 'Preview updating...' : 'Updated'}
      </span>
    </div>
  );
};
