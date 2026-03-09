import React from 'react';

interface ExportButtonProps {
  onExport: () => void;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport }) => (
  <button
    onClick={onExport}
    className="export-button"
    style={{
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      backgroundColor: 'rgba(75, 85, 99, 0.8)',
      color: '#d1d5db',
      border: '1px solid rgba(107, 114, 128, 0.5)',
      padding: '0.5rem 1rem',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      cursor: 'pointer',
      transition: 'all 0.2s',
      zIndex: 1000,
      height: '2.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '4.5rem'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 0.9)';
      e.currentTarget.style.borderColor = 'rgba(75, 85, 99, 0.7)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.8)';
      e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.5)';
    }}
  >
    Export
  </button>
);
