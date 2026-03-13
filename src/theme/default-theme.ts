import { ThemeComponents, ThemeTokens } from '../types';

export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  colors: {
    primary: { value: '#3B82F6' },
    secondary: { value: '#6B7280' },
    success: { value: '#10B981' },
    warning: { value: '#F59E0B' },
    error: { value: '#EF4444' },
    surface: { value: '#1F2937' },
    background: { value: '#F9FAFB' },
    text: {
      primary: { value: '#F9FAFB' },
      secondary: { value: '#D1D5DB' },
      muted: { value: '#9CA3AF' },
      dark: { value: '#111827' }
    }
  },
  spacing: {
    xs: { value: '0.5rem' },
    sm: { value: '0.75rem' },
    md: { value: '1rem' },
    lg: { value: '1.5rem' },
    xl: { value: '2rem' }
  },
  typography: {
    fontFamily: { value: 'system-ui, -apple-system, sans-serif' },
    fontSize: {
      xs: { value: '0.75rem' },
      sm: { value: '0.875rem' },
      base: { value: '1rem' },
      lg: { value: '1.125rem' },
      xl: { value: '1.25rem' },
      '2xl': { value: '1.5rem' },
      '3xl': { value: '1.875rem' },
      '4xl': { value: '2.25rem' }
    }
  },
  borderRadius: {
    sm: { value: '0.25rem' },
    md: { value: '0.375rem' },
    lg: { value: '0.5rem' },
    xl: { value: '0.75rem' }
  },
  shadows: {
    sm: { value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' },
    md: { value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' },
    lg: { value: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }
  }
};

export const DEFAULT_THEME_COMPONENTS: ThemeComponents = {
  button: {
    primary: {
      backgroundColor: 'var(--color-primary)',
      color: 'var(--color-text-primary)',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      borderRadius: 'var(--border-radius-md)',
      border: 'none',
      cursor: 'pointer',
      fontSize: 'var(--typography-fontSize-base)',
      fontWeight: 'medium',
      transition: 'all 0.2s ease-in-out'
    },
    secondary: {
      backgroundColor: 'var(--color-secondary)',
      color: 'var(--color-text-primary)',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      borderRadius: 'var(--border-radius-md)',
      border: 'none',
      cursor: 'pointer',
      fontSize: 'var(--typography-fontSize-base)',
      fontWeight: 'medium',
      transition: 'all 0.2s ease-in-out'
    },
    submit: {
      backgroundColor: 'var(--color-success)',
      color: 'var(--color-text-primary)',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      borderRadius: 'var(--border-radius-md)',
      border: 'none',
      cursor: 'pointer',
      fontSize: 'var(--typography-fontSize-base)',
      fontWeight: 'medium',
      transition: 'all 0.2s ease-in-out'
    }
  },
  alert: {
    info: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'var(--color-primary)',
      color: 'var(--color-primary)',
      borderWidth: '1px',
      borderRadius: 'var(--border-radius-lg)',
      padding: 'var(--spacing-md)',
      fontSize: 'var(--typography-fontSize-base)',
      fontWeight: 'normal'
    },
    success: {
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'var(--color-success)',
      color: 'var(--color-success)',
      borderWidth: '1px',
      borderRadius: 'var(--border-radius-lg)',
      padding: 'var(--spacing-md)',
      fontSize: 'var(--typography-fontSize-base)',
      fontWeight: 'normal'
    },
    warning: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'var(--color-warning)',
      color: 'var(--color-warning)',
      borderWidth: '1px',
      borderRadius: 'var(--border-radius-lg)',
      padding: 'var(--spacing-md)',
      fontSize: 'var(--typography-fontSize-base)',
      fontWeight: 'normal'
    },
    error: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: 'var(--color-error)',
      color: 'var(--color-error)',
      borderWidth: '1px',
      borderRadius: 'var(--border-radius-lg)',
      padding: 'var(--spacing-md)',
      fontSize: 'var(--typography-fontSize-base)',
      fontWeight: 'normal'
    }
  }
};
