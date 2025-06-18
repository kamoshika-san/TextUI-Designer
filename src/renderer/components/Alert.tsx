import React from 'react';
import type { AlertComponent } from '../types';

const typeStyles: Record<AlertComponent['type'], string> = {
  info: 'bg-blue-100 text-blue-800 border-blue-300',
  success: 'bg-green-100 text-green-800 border-green-300',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  error: 'bg-red-100 text-red-800 border-red-300',
};

export const Alert: React.FC<AlertComponent> = ({ type, message }) => {
  return (
    <div className={`border-l-4 p-3 mb-2 rounded ${typeStyles[type]}`}>{message}</div>
  );
}; 