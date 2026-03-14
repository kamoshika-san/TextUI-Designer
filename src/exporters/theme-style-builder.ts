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

    /* ボタン: WebView 同一経路（.textui-button.*）とレガシー（data-kind）の両方に対応 */
    button[data-kind="primary"],
    .textui-button.primary {
      background-color: var(--component-button-primary-backgroundColor, var(--color-primary, var(--colors-primary, #2563eb))) !important;
      color: var(--component-button-primary-color, var(--color-text-primary, var(--colors-text-primary, #ffffff))) !important;
      border-radius: var(--component-button-primary-borderRadius, var(--borderRadius-md, 0.375rem)) !important;
      border: var(--component-button-primary-border, none) !important;
    }

    button[data-kind="secondary"],
    .textui-button.secondary {
      background-color: var(--component-button-secondary-backgroundColor, var(--color-secondary, var(--colors-secondary, #374151))) !important;
      color: var(--component-button-secondary-color, var(--color-text-primary, var(--colors-text-primary, #d1d5db))) !important;
      border-radius: var(--component-button-secondary-borderRadius, var(--borderRadius-md, 0.375rem)) !important;
      border: var(--component-button-secondary-border, none) !important;
    }

    button[data-kind="submit"],
    .textui-button.submit {
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
    }

    .textui-image {
      border-radius: var(--component-image-default-borderRadius, 0) !important;
      object-fit: var(--component-image-default-objectFit, cover) !important;
      border: var(--component-image-default-border, none) !important;
      border-color: var(--component-image-default-borderColor, var(--color-border-default, transparent)) !important;
    }

    .textui-image.rounded-full {
      border-radius: var(--component-image-avatar-borderRadius, var(--component-image-default-borderRadius, 50%)) !important;
      object-fit: var(--component-image-avatar-objectFit, var(--component-image-default-objectFit, cover)) !important;
      border: var(--component-image-avatar-border, var(--component-image-default-border, none)) !important;
      border-color: var(--component-image-avatar-borderColor, var(--component-image-default-borderColor, var(--color-border-default, transparent))) !important;
    }

    .textui-badge {
      background-color: var(--component-badge-default-backgroundColor, var(--color-surface, rgba(107, 114, 128, 0.25))) !important;
      color: var(--component-badge-default-color, var(--color-text-primary, #e5e7eb)) !important;
      border-radius: var(--component-badge-default-borderRadius, 9999px) !important;
      border: var(--component-badge-default-border, none) !important;
      padding: var(--component-badge-default-padding, 0.25em 0.6em) !important;
      font-weight: var(--component-badge-default-fontWeight, 600) !important;
    }

    .textui-badge-primary {
      background-color: var(--component-badge-primary-backgroundColor, rgba(59, 130, 246, 0.2)) !important;
      color: var(--component-badge-primary-color, #93c5fd) !important;
    }

    .textui-badge-success {
      background-color: var(--component-badge-success-backgroundColor, rgba(34, 197, 94, 0.2)) !important;
      color: var(--component-badge-success-color, #86efac) !important;
    }

    .textui-badge-warning {
      background-color: var(--component-badge-warning-backgroundColor, rgba(245, 158, 11, 0.22)) !important;
      color: var(--component-badge-warning-color, #fcd34d) !important;
    }

    .textui-badge-error {
      background-color: var(--component-badge-error-backgroundColor, rgba(239, 68, 68, 0.2)) !important;
      color: var(--component-badge-error-color, #fca5a5) !important;
    }

    .textui-badge-sm {
      font-size: var(--component-badge-sm-fontSize, 0.75rem) !important;
      padding: var(--component-badge-sm-padding, 0.15em 0.5em) !important;
    }

    .textui-badge-md {
      font-size: var(--component-badge-md-fontSize, 0.875rem) !important;
      padding: var(--component-badge-md-padding, 0.25em 0.6em) !important;
    }

    .textui-progress {
      width: var(--component-progress-base-width, 100%) !important;
      max-width: var(--component-progress-base-maxWidth, 32rem) !important;
      margin-bottom: var(--component-progress-base-marginBottom, 0.75rem) !important;
    }

    .textui-progress-header {
      color: var(--component-progress-header-color, var(--color-text-secondary, #d1d5db)) !important;
      gap: var(--component-progress-header-gap, 0.75rem) !important;
      margin-bottom: var(--component-progress-header-marginBottom, 0.25rem) !important;
      font-size: var(--component-progress-header-fontSize, 0.875rem) !important;
    }

    .textui-progress-track {
      display: flex !important;
      height: var(--component-progress-track-height, 0.5rem) !important;
      border-radius: var(--component-progress-track-borderRadius, 9999px) !important;
      background-color: var(--component-progress-track-backgroundColor, var(--color-surface, rgba(107, 114, 128, 0.25))) !important;
    }

    .textui-progress-fill {
      border-radius: var(--component-progress-fill-borderRadius, 9999px) !important;
      transition: var(--component-progress-fill-transition, width 0.2s ease) !important;
      background-color: var(--component-progress-fill-backgroundColor, rgba(107, 114, 128, 0.7)) !important;
    }

    .textui-progress-default {
      background-color: var(--component-progress-default-backgroundColor, rgba(107, 114, 128, 0.7)) !important;
    }

    .textui-progress-primary {
      background-color: var(--component-progress-primary-backgroundColor, #3b82f6) !important;
    }

    .textui-progress-success {
      background-color: var(--component-progress-success-backgroundColor, #22c55e) !important;
    }

    .textui-progress-warning {
      background-color: var(--component-progress-warning-backgroundColor, #f59e0b) !important;
    }

    .textui-progress-error {
      background-color: var(--component-progress-error-backgroundColor, #ef4444) !important;
    }`;
}
