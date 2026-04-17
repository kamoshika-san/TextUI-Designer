import React from 'react';

interface ExportButtonProps {
  onExport: () => void;
  onExportPreview?: () => void;
  sourceLabel?: string;
  sourceTitle?: string;
}

const buttonBase: React.CSSProperties = {
  backgroundColor: 'rgba(75, 85, 99, 0.8)',
  color: '#d1d5db',
  border: '1px solid rgba(107, 114, 128, 0.5)',
  padding: '0.5rem 1rem',
  borderRadius: '0.375rem',
  fontSize: '0.875rem',
  cursor: 'pointer',
  transition: 'all 0.2s',
  height: '2.5rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '4.5rem'
};

const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.9)';
  e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.7)';
};

const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
  e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.8)';
  e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.5)';
};

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  onExportPreview,
  sourceLabel,
  sourceTitle
}) => (
  <div
    style={{
      display: 'flex',
      gap: '0.5rem',
      alignItems: 'center',
      flexShrink: 0
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: '12rem',
        maxWidth: '18rem',
        padding: '0.45rem 0.7rem',
        borderRadius: '0.5rem',
        border: '1px solid rgba(107, 114, 128, 0.35)',
        background: 'rgba(17, 24, 39, 0.88)',
        color: '#cbd5e1',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.18)'
      }}
      title={sourceTitle ?? sourceLabel}
    >
      <span style={{ fontSize: '0.68rem', letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.65 }}>
        Export Target
      </span>
      <span
        style={{
          fontSize: '0.78rem',
          lineHeight: 1.35,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {sourceLabel ?? 'Waiting for preview file'}
      </span>
    </div>
    {onExportPreview && (
      <button
        onClick={onExportPreview}
        className="export-button"
        style={{ ...buttonBase, fontSize: '0.8rem', minWidth: '5.5rem' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        title="Export Preview (Dry Run) - shows what would be exported without writing files"
      >
        Dry Run
      </button>
    )}
    <button
      onClick={onExport}
      className="export-button"
      style={buttonBase}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      Export
    </button>
  </div>
);
