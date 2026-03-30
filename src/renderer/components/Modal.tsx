import React from 'react';
import { ModalComponent, ModalActionKind } from '../../domain/dsl-types';
import { tokenToPreviewInlineStyle } from '../token-inline-style-from-definition';

const actionKindStyles: Record<ModalActionKind, React.CSSProperties> = {
  primary: { backgroundColor: 'rgba(59,130,246,0.85)', color: '#fff', border: 'none' },
  secondary: { backgroundColor: 'rgba(107,114,128,0.25)', color: '#d1d5db', border: '1px solid rgba(107,114,128,0.4)' },
  danger: { backgroundColor: 'rgba(239,68,68,0.85)', color: '#fff', border: 'none' },
  ghost: { backgroundColor: 'transparent', color: '#d1d5db', border: '1px solid rgba(107,114,128,0.3)' }
};

export const Modal: React.FC<ModalComponent> = ({ title, open = true, body, actions, token }) => {
  if (!open) {
    return (
      <div className="textui-modal-closed">
        <span className="textui-modal-closed-label">
          {title ? `Modal: ${title} (closed)` : 'Modal (closed)'}
        </span>
      </div>
    );
  }

  return (
    <div className="textui-modal-backdrop" style={tokenToPreviewInlineStyle('Modal', token)}>
      <div className="textui-modal-card">
        {title && (
          <div className="textui-modal-header">
            <span className="textui-modal-title">{title}</span>
          </div>
        )}
        {body && (
          <div className="textui-modal-body">{body}</div>
        )}
        {actions && actions.length > 0 && (
          <div className="textui-modal-footer">
            {actions.map((action, i) => (
              <button
                key={i}
                className="textui-modal-action"
                style={actionKindStyles[action.kind ?? 'secondary']}
                disabled
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
