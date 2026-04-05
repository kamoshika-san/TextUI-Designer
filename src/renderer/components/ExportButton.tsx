import React from 'react';

interface ExportButtonProps {
  onExport: () => void;
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

export const ExportButton: React.FC<ExportButtonProps> = ({ onExport }) => (
  <div
    style={{
      position: 'fixed',
      top: '1rem',
      right: '1rem',
      display: 'flex',
      gap: '0.5rem',
      zIndex: 1000
    }}
  >
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
