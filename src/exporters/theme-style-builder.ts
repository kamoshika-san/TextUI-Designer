export function buildThemeStyleBlock(allVars: Record<string, string>): string {
  if (Object.keys(allVars).length === 0) {
    return '';
  }

  const varLines = Object.entries(allVars)
    .map(([key, value]) => `  --${key}: ${value} !important;`)
    .join('\n');

  return `
    /* textui-theme.yml から反映されたテーマ */
    :root {
${varLines}
    }

    body {
      background-color: var(--color-background, var(--colors-background, #1e1e1e)) !important;
      color: var(--color-text-primary, var(--colors-text-primary, #cccccc)) !important;
      font-family: var(--typography-fontFamily, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif) !important;
      font-size: var(--typography-fontSize-base, 16px) !important;
    }

    h1, h2, h3, p, small {
      color: var(--color-text-primary, var(--colors-text-primary, inherit)) !important;
    }

    label {
      color: var(--color-text-secondary, var(--colors-text-secondary, inherit)) !important;
    }

    input,
    textarea,
    select {
      background-color: var(--color-surface, var(--colors-surface, #1f2937)) !important;
      color: var(--color-text-primary, var(--colors-text-primary, #d1d5db)) !important;
      border-color: var(--color-secondary, var(--colors-secondary, #4b5563)) !important;
      border-radius: var(--borderRadius-md, 0.375rem) !important;
    }

    button[data-kind="primary"] {
      background-color: var(--component-button-primary-backgroundColor, var(--color-primary, var(--colors-primary, #2563eb))) !important;
      color: var(--component-button-primary-color, var(--color-text-primary, var(--colors-text-primary, #ffffff))) !important;
      border-radius: var(--component-button-primary-borderRadius, var(--borderRadius-md, 0.375rem)) !important;
      border: var(--component-button-primary-border, none) !important;
    }

    button[data-kind="secondary"] {
      background-color: var(--component-button-secondary-backgroundColor, var(--color-secondary, var(--colors-secondary, #374151))) !important;
      color: var(--component-button-secondary-color, var(--color-text-primary, var(--colors-text-primary, #d1d5db))) !important;
      border-radius: var(--component-button-secondary-borderRadius, var(--borderRadius-md, 0.375rem)) !important;
      border: var(--component-button-secondary-border, none) !important;
    }

    button[data-kind="submit"] {
      background-color: var(--component-button-submit-backgroundColor, var(--color-success, var(--colors-success, #16a34a))) !important;
      color: var(--component-button-submit-color, var(--color-text-primary, var(--colors-text-primary, #ffffff))) !important;
      border-radius: var(--component-button-submit-borderRadius, var(--borderRadius-md, 0.375rem)) !important;
      border: var(--component-button-submit-border, none) !important;
    }

    [data-alert-variant="info"] {
      background-color: var(--component-alert-info-backgroundColor, rgba(59, 130, 246, 0.1)) !important;
      color: var(--component-alert-info-color, var(--color-primary, var(--colors-primary, #60a5fa))) !important;
      border-color: var(--component-alert-info-borderColor, var(--color-primary, var(--colors-primary, #3b82f6))) !important;
    }

    [data-alert-variant="success"] {
      background-color: var(--component-alert-success-backgroundColor, rgba(34, 197, 94, 0.1)) !important;
      color: var(--component-alert-success-color, var(--color-success, var(--colors-success, #4ade80))) !important;
      border-color: var(--component-alert-success-borderColor, var(--color-success, var(--colors-success, #22c55e))) !important;
    }

    [data-alert-variant="warning"] {
      background-color: var(--component-alert-warning-backgroundColor, rgba(245, 158, 11, 0.1)) !important;
      color: var(--component-alert-warning-color, var(--color-warning, var(--colors-warning, #facc15))) !important;
      border-color: var(--component-alert-warning-borderColor, var(--color-warning, var(--colors-warning, #eab308))) !important;
    }

    [data-alert-variant="error"] {
      background-color: var(--component-alert-error-backgroundColor, rgba(239, 68, 68, 0.1)) !important;
      color: var(--component-alert-error-color, var(--color-error, var(--colors-error, #f87171))) !important;
      border-color: var(--component-alert-error-borderColor, var(--color-error, var(--colors-error, #ef4444))) !important;
    }`;
}
