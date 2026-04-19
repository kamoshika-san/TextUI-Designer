import * as fs from 'fs';
import * as path from 'path';
import { getSharedLayoutStyles, getExportCriticalLayoutUtilities } from '../shared/layout-styles';

export interface BuildHtmlDocumentOptions {
  /** WebView built CSS (media/assets/index-*.css). Prefer this when present. */
  webviewCss?: string;
  /** React static export path writes the component HTML directly without the default wrapper. */
  noWrap?: boolean;
  /** Fallback lane only: append compatibility CSS without widening the primary default contract. */
  compatibilityCss?: string;
}

function getDefaultExportStyleBlock(): string {
  return `
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    html {
      font-size: 16px;
      line-height: 1.5;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: rgb(209 213 219);
      background-color: rgb(17 24 39);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    input,
    button,
    textarea,
    select {
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: inherit;
      margin: 0;
      padding: 0;
    }

    select[multiple] option:checked {
      background-color: #3b82f6 !important;
      color: #ffffff !important;
    }

    select[multiple] option:checked:not(:focus) {
      background-color: #3b82f6 !important;
      color: #ffffff !important;
    }

${getSharedLayoutStyles()}
${getExportCriticalLayoutUtilities()}

    select[multiple]:focus option:checked {
      background-color: #3b82f6 !important;
      color: #ffffff !important;
    }
`;
}

function getFallbackCompatibilityStyleBlock(): string {
  return `
    .textui-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.25em 0.6em;
      border-radius: 9999px;
      font-weight: 600;
      line-height: 1;
      box-sizing: border-box;
      vertical-align: middle;
    }

    .textui-badge-default { background-color: rgba(107, 114, 128, 0.25); color: #e5e7eb; }
    .textui-badge-primary { background-color: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .textui-badge-success { background-color: rgba(34, 197, 94, 0.2); color: #86efac; }
    .textui-badge-warning { background-color: rgba(245, 158, 11, 0.22); color: #fcd34d; }
    .textui-badge-error { background-color: rgba(239, 68, 68, 0.2); color: #fca5a5; }

    .textui-tabs {
      border-color: rgb(208 215 222);
    }

    .textui-tabs .flex {
      display: flex;
      flex-wrap: nowrap;
      border-bottom-color: rgb(208 215 222);
    }

    .textui-tabs .flex > button {
      flex-shrink: 0;
      min-height: 2.25rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      border-right-color: rgb(208 215 222);
      background-color: rgb(246 248 250);
      color: rgb(101 109 118);
    }

    .textui-tabs .flex > button:last-child {
      border-right-width: 0;
    }

    .textui-tabs .flex > button.textui-tab-active {
      background-color: rgb(234 238 242);
      color: rgb(31 35 40);
    }

    .textui-progress {
      display: block;
      width: 100%;
      max-width: 32rem;
      margin-bottom: 0.75rem;
    }

    .textui-progress-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
      font-size: 0.875rem;
      color: #d1d5db;
    }

    .textui-progress-track {
      display: flex;
      width: 100%;
      height: 0.5rem;
      border-radius: 9999px;
      background-color: rgba(107, 114, 128, 0.25);
      overflow: hidden;
    }

    .textui-progress-fill {
      height: 100%;
      border-radius: 9999px;
      transition: width 0.2s ease;
      background-color: rgba(107, 114, 128, 0.7);
    }

    .textui-progress-primary { background-color: #3b82f6; }
    .textui-progress-success { background-color: #22c55e; }
    .textui-progress-warning { background-color: #f59e0b; }
    .textui-progress-error { background-color: #ef4444; }

    .textui-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.375rem 0.875rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
      cursor: default;
      border: 1px solid transparent;
      box-sizing: border-box;
    }

    .textui-button.primary {
      background-color: #3b82f6;
      color: #fff;
      border-color: transparent;
    }

    .textui-button.secondary {
      background-color: rgba(107, 114, 128, 0.25);
      color: #d1d5db;
      border-color: rgba(107, 114, 128, 0.4);
    }

    .textui-button.danger {
      background-color: #ef4444;
      color: #fff;
      border-color: transparent;
    }

    .textui-button.ghost {
      background-color: transparent;
      color: #d1d5db;
      border-color: rgba(107, 114, 128, 0.3);
    }

    .textui-button:disabled,
    .textui-button.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
`;
}

export function buildHtmlDocument(
  componentCode: string,
  themeStyles: string,
  options?: BuildHtmlDocumentOptions
): string {
  const styleContent = options?.webviewCss ?? getDefaultExportStyleBlock();
  const compatibilityCss = options?.compatibilityCss ?? '';
  const bodyContent = options?.noWrap
    ? componentCode
    : `  <div style="box-sizing:border-box;width:100%;max-width:100%;padding:1.5rem;">\n${componentCode}\n  </div>`;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TextUI Export</title>
  <style>
${styleContent}
${compatibilityCss}
${themeStyles}
    html, body { max-width: 100%; overflow-x: auto; }
  </style>
</head>
<body class="bg-gray-900 text-gray-300 min-h-screen">
${bodyContent}
</body>
</html>`;
}

export function buildFallbackCompatibilityStyleBlock(): string {
  return getFallbackCompatibilityStyleBlock();
}

/**
 * Resolve built WebView CSS from media/assets/index-*.css.
 * This keeps export / screenshot flows aligned with the WebView when assets exist.
 */
export function readWebviewCssIfPresent(fromDir?: string): string | undefined {
  const localCandidates = [
    path.join(__dirname, '..', 'media', 'assets'),
    path.join(__dirname, '..', '..', 'media', 'assets')
  ];
  const candidates = fromDir
    ? [path.join(fromDir, 'media', 'assets'), ...localCandidates]
    : localCandidates;
  for (const assetsDir of candidates) {
    try {
      if (!fs.existsSync(assetsDir)) {
        continue;
      }
      const files = fs.readdirSync(assetsDir);
      const cssFile = files.find((f) => f.startsWith('index-') && f.endsWith('.css'));
      if (!cssFile) {
        continue;
      }
      const cssPath = path.join(assetsDir, cssFile);
      return fs.readFileSync(cssPath, 'utf8');
    } catch {
      continue;
    }
  }
  return undefined;
}
