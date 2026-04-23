import * as fs from 'fs';
import * as path from 'path';
import { getSharedLayoutStyles, getExportCriticalLayoutUtilities } from '../shared/layout-styles';
import { PREVIEW_SHELL_BODY_CLASS, wrapWithPreviewShellDocument } from '../shared/preview-shell';

export interface BuildHtmlDocumentOptions {
  /** WebView built CSS (media/assets/index-*.css). Prefer this when present. */
  webviewCss?: string;
  /** React static export path skips the legacy padded inner wrapper, but still gets the shared root shell. */
  noWrap?: boolean;
  /** Optional extra `<style>` fragment appended after the default export styles (e.g. tests). */
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
      padding: 0 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 16px;
      line-height: 1.5;
      color: rgb(209 213 219);
      background-color: rgb(17 24 39);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    #root,
    .textui-preview-shell-root {
      background-color: rgb(17 24 39);
      min-height: 100vh;
      padding: 1rem;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
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

export function buildHtmlDocument(
  componentCode: string,
  themeStyles: string,
  options?: BuildHtmlDocumentOptions
): string {
  const styleContent = options?.webviewCss ?? getDefaultExportStyleBlock();
  const compatibilityCss = options?.compatibilityCss ?? '';
  const innerContent = options?.noWrap
    ? componentCode
    : `  <div style="box-sizing:border-box;width:100%;max-width:100%;padding:1.5rem;">\n${componentCode}\n  </div>`;
  const bodyContent = wrapWithPreviewShellDocument(innerContent);
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
<body class="bg-gray-900 text-gray-300 min-h-screen ${PREVIEW_SHELL_BODY_CLASS}">
${bodyContent}
</body>
</html>`;
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
