export type ThemeStyleValue =
  | {
      kind: 'var';
      /**
       * theme-vars の var key（例: `component-button-primary-backgroundColor`）
       * ※ `--${varKey}` の形で :root に宣言される
       */
      varKey: string;
      /** var の fallback（例: `var(--color-primary, #2563eb)`） */
      fallback: string;
    }
  | {
      kind: 'raw';
      /** そのまま出力する値（!important は generator 側で付与） */
      value: string;
    };

export type ThemeStyleDeclaration = {
  property: string;
  value: ThemeStyleValue;
};

export type ThemeStyleRuleBlock = {
  selectors: string[];
  declarations: ThemeStyleDeclaration[];
};

/**
 * theme-style-builder が生成する “セレクタ付き上書きCSS” の単一情報源。
 * - :root の CSS変数宣言（値）は ThemeUtils/ThemeManager 側が生成
 * - ここは「どのセレクタに対して、どの var key を参照して上書きするか」を保持する
 */
export const THEME_STYLE_RULE_BLOCKS: readonly ThemeStyleRuleBlock[] = [
  {
    selectors: ['body'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'color-background', fallback: 'var(--colors-background, #1e1e1e)' } },
      { property: 'color', value: { kind: 'var', varKey: 'color-text-primary', fallback: 'var(--colors-text-primary, #cccccc)' } },
      {
        property: 'font-family',
        value: {
          kind: 'var',
          varKey: 'typography-fontFamily',
          fallback: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }
      },
      { property: 'font-size', value: { kind: 'var', varKey: 'typography-fontSize-base', fallback: '16px' } }
    ]
  },
  {
    selectors: ['h1', 'h2', 'h3', 'p', 'small'],
    declarations: [{ property: 'color', value: { kind: 'var', varKey: 'color-text-primary', fallback: 'var(--colors-text-primary, inherit)' } }]
  },
  {
    selectors: ['label'],
    declarations: [{ property: 'color', value: { kind: 'var', varKey: 'color-text-secondary', fallback: 'var(--colors-text-secondary, inherit)' } }]
  },
  {
    selectors: ['input', 'textarea', 'select'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'color-surface', fallback: 'var(--colors-surface, #1f2937)' } },
      { property: 'color', value: { kind: 'var', varKey: 'color-text-primary', fallback: 'var(--colors-text-primary, #d1d5db)' } },
      { property: 'border-color', value: { kind: 'var', varKey: 'color-secondary', fallback: 'var(--colors-secondary, #4b5563)' } },
      { property: 'border-radius', value: { kind: 'var', varKey: 'borderRadius-md', fallback: '0.375rem' } }
    ]
  },
  {
    selectors: ['button[data-kind="primary"]', '.textui-button.primary'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-button-primary-backgroundColor', fallback: 'var(--color-primary, var(--colors-primary, #2563eb))' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-button-primary-color', fallback: 'var(--color-text-primary, var(--colors-text-primary, #ffffff))' } },
      { property: 'border-radius', value: { kind: 'var', varKey: 'component-button-primary-borderRadius', fallback: 'var(--borderRadius-md, 0.375rem)' } },
      { property: 'border', value: { kind: 'var', varKey: 'component-button-primary-border', fallback: 'none' } }
    ]
  },
  {
    selectors: ['button[data-kind="secondary"]', '.textui-button.secondary'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-button-secondary-backgroundColor', fallback: 'var(--color-secondary, var(--colors-secondary, #374151))' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-button-secondary-color', fallback: 'var(--color-text-primary, var(--colors-text-primary, #d1d5db))' } },
      { property: 'border-radius', value: { kind: 'var', varKey: 'component-button-secondary-borderRadius', fallback: 'var(--borderRadius-md, 0.375rem)' } },
      { property: 'border', value: { kind: 'var', varKey: 'component-button-secondary-border', fallback: 'none' } }
    ]
  },
  {
    selectors: ['button[data-kind="submit"]', '.textui-button.submit'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-button-submit-backgroundColor', fallback: 'var(--color-success, var(--colors-success, #16a34a))' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-button-submit-color', fallback: 'var(--color-text-primary, var(--colors-text-primary, #ffffff))' } },
      { property: 'border-radius', value: { kind: 'var', varKey: 'component-button-submit-borderRadius', fallback: 'var(--borderRadius-md, 0.375rem)' } },
      { property: 'border', value: { kind: 'var', varKey: 'component-button-submit-border', fallback: 'none' } }
    ]
  },
  {
    selectors: ['[data-alert-variant="info"]'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-alert-info-backgroundColor', fallback: 'rgba(59, 130, 246, 0.1)' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-alert-info-color', fallback: 'var(--color-primary, var(--colors-primary, #60a5fa))' } },
      { property: 'border-color', value: { kind: 'var', varKey: 'component-alert-info-borderColor', fallback: 'var(--color-primary, var(--colors-primary, #3b82f6))' } }
    ]
  },
  {
    selectors: ['[data-alert-variant="success"]'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-alert-success-backgroundColor', fallback: 'rgba(34, 197, 94, 0.1)' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-alert-success-color', fallback: 'var(--color-success, var(--colors-success, #4ade80))' } },
      { property: 'border-color', value: { kind: 'var', varKey: 'component-alert-success-borderColor', fallback: 'var(--color-success, var(--colors-success, #22c55e))' } }
    ]
  },
  {
    selectors: ['[data-alert-variant="warning"]'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-alert-warning-backgroundColor', fallback: 'rgba(245, 158, 11, 0.1)' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-alert-warning-color', fallback: 'var(--color-warning, var(--colors-warning, #facc15))' } },
      { property: 'border-color', value: { kind: 'var', varKey: 'component-alert-warning-borderColor', fallback: 'var(--color-warning, var(--colors-warning, #eab308))' } }
    ]
  },
  {
    selectors: ['[data-alert-variant="error"]'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-alert-error-backgroundColor', fallback: 'rgba(239, 68, 68, 0.1)' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-alert-error-color', fallback: 'var(--color-error, var(--colors-error, #f87171))' } },
      { property: 'border-color', value: { kind: 'var', varKey: 'component-alert-error-borderColor', fallback: 'var(--color-error, var(--colors-error, #ef4444))' } }
    ]
  },
  {
    selectors: ['.textui-image'],
    declarations: [
      { property: 'border-radius', value: { kind: 'var', varKey: 'component-image-default-borderRadius', fallback: '0' } },
      { property: 'object-fit', value: { kind: 'var', varKey: 'component-image-default-objectFit', fallback: 'cover' } },
      { property: 'border', value: { kind: 'var', varKey: 'component-image-default-border', fallback: 'none' } },
      { property: 'border-color', value: { kind: 'var', varKey: 'component-image-default-borderColor', fallback: 'var(--color-border-default, transparent)' } }
    ]
  },
  {
    selectors: ['.textui-image.rounded-full'],
    declarations: [
      { property: 'border-radius', value: { kind: 'var', varKey: 'component-image-avatar-borderRadius', fallback: 'var(--component-image-default-borderRadius, 50%)' } },
      { property: 'object-fit', value: { kind: 'var', varKey: 'component-image-avatar-objectFit', fallback: 'var(--component-image-default-objectFit, cover)' } },
      { property: 'border', value: { kind: 'var', varKey: 'component-image-avatar-border', fallback: 'var(--component-image-default-border, none)' } },
      {
        property: 'border-color',
        value: { kind: 'var', varKey: 'component-image-avatar-borderColor', fallback: 'var(--component-image-default-borderColor, var(--color-border-default, transparent))' }
      }
    ]
  },
  {
    selectors: ['.textui-badge'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-badge-default-backgroundColor', fallback: 'var(--color-surface, rgba(107, 114, 128, 0.25))' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-badge-default-color', fallback: 'var(--color-text-primary, #e5e7eb)' } },
      { property: 'border-radius', value: { kind: 'var', varKey: 'component-badge-default-borderRadius', fallback: '9999px' } },
      { property: 'border', value: { kind: 'var', varKey: 'component-badge-default-border', fallback: 'none' } },
      { property: 'padding', value: { kind: 'var', varKey: 'component-badge-default-padding', fallback: '0.25em 0.6em' } },
      { property: 'font-weight', value: { kind: 'var', varKey: 'component-badge-default-fontWeight', fallback: '600' } }
    ]
  },
  {
    selectors: ['.textui-badge-primary'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-badge-primary-backgroundColor', fallback: 'rgba(59, 130, 246, 0.2)' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-badge-primary-color', fallback: '#93c5fd' } }
    ]
  },
  {
    selectors: ['.textui-badge-success'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-badge-success-backgroundColor', fallback: 'rgba(34, 197, 94, 0.2)' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-badge-success-color', fallback: '#86efac' } }
    ]
  },
  {
    selectors: ['.textui-badge-warning'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-badge-warning-backgroundColor', fallback: 'rgba(245, 158, 11, 0.22)' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-badge-warning-color', fallback: '#fcd34d' } }
    ]
  },
  {
    selectors: ['.textui-badge-error'],
    declarations: [
      { property: 'background-color', value: { kind: 'var', varKey: 'component-badge-error-backgroundColor', fallback: 'rgba(239, 68, 68, 0.2)' } },
      { property: 'color', value: { kind: 'var', varKey: 'component-badge-error-color', fallback: '#fca5a5' } }
    ]
  },
  {
    selectors: ['.textui-badge-sm'],
    declarations: [
      { property: 'font-size', value: { kind: 'var', varKey: 'component-badge-sm-fontSize', fallback: '0.75rem' } },
      { property: 'padding', value: { kind: 'var', varKey: 'component-badge-sm-padding', fallback: '0.15em 0.5em' } }
    ]
  },
  {
    selectors: ['.textui-badge-md'],
    declarations: [
      { property: 'font-size', value: { kind: 'var', varKey: 'component-badge-md-fontSize', fallback: '0.875rem' } },
      { property: 'padding', value: { kind: 'var', varKey: 'component-badge-md-padding', fallback: '0.25em 0.6em' } }
    ]
  },
  {
    selectors: ['.textui-progress'],
    declarations: [
      { property: 'width', value: { kind: 'var', varKey: 'component-progress-base-width', fallback: '100%' } },
      { property: 'max-width', value: { kind: 'var', varKey: 'component-progress-base-maxWidth', fallback: '32rem' } },
      { property: 'margin-bottom', value: { kind: 'var', varKey: 'component-progress-base-marginBottom', fallback: '0.75rem' } }
    ]
  },
  {
    selectors: ['.textui-progress-header'],
    declarations: [
      { property: 'color', value: { kind: 'var', varKey: 'component-progress-header-color', fallback: 'var(--color-text-secondary, #d1d5db)' } },
      { property: 'gap', value: { kind: 'var', varKey: 'component-progress-header-gap', fallback: '0.75rem' } },
      { property: 'margin-bottom', value: { kind: 'var', varKey: 'component-progress-header-marginBottom', fallback: '0.25rem' } },
      { property: 'font-size', value: { kind: 'var', varKey: 'component-progress-header-fontSize', fallback: '0.875rem' } }
    ]
  },
  {
    selectors: ['.textui-progress-track'],
    declarations: [
      { property: 'display', value: { kind: 'raw', value: 'flex' } },
      { property: 'height', value: { kind: 'var', varKey: 'component-progress-track-height', fallback: '0.5rem' } },
      { property: 'border-radius', value: { kind: 'var', varKey: 'component-progress-track-borderRadius', fallback: '9999px' } },
      { property: 'background-color', value: { kind: 'var', varKey: 'component-progress-track-backgroundColor', fallback: 'var(--color-surface, rgba(107, 114, 128, 0.25))' } }
    ]
  },
  {
    selectors: ['.textui-progress-fill'],
    declarations: [
      { property: 'border-radius', value: { kind: 'var', varKey: 'component-progress-fill-borderRadius', fallback: '9999px' } },
      { property: 'transition', value: { kind: 'var', varKey: 'component-progress-fill-transition', fallback: 'width 0.2s ease' } },
      { property: 'background-color', value: { kind: 'var', varKey: 'component-progress-fill-backgroundColor', fallback: 'rgba(107, 114, 128, 0.7)' } }
    ]
  },
  {
    selectors: ['.textui-progress-default'],
    declarations: [{ property: 'background-color', value: { kind: 'var', varKey: 'component-progress-default-backgroundColor', fallback: 'rgba(107, 114, 128, 0.7)' } }]
  },
  {
    selectors: ['.textui-progress-primary'],
    declarations: [{ property: 'background-color', value: { kind: 'var', varKey: 'component-progress-primary-backgroundColor', fallback: '#3b82f6' } }]
  },
  {
    selectors: ['.textui-progress-success'],
    declarations: [{ property: 'background-color', value: { kind: 'var', varKey: 'component-progress-success-backgroundColor', fallback: '#22c55e' } }]
  },
  {
    selectors: ['.textui-progress-warning'],
    declarations: [{ property: 'background-color', value: { kind: 'var', varKey: 'component-progress-warning-backgroundColor', fallback: '#f59e0b' } }]
  },
  {
    selectors: ['.textui-progress-error'],
    declarations: [{ property: 'background-color', value: { kind: 'var', varKey: 'component-progress-error-backgroundColor', fallback: '#ef4444' } }]
  }
];

