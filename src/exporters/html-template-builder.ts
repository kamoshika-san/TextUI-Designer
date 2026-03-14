import * as fs from 'fs';
import * as path from 'path';
import { getSharedLayoutStyles, getExportCriticalLayoutUtilities } from '../shared/layout-styles';

export interface BuildHtmlDocumentOptions {
  /** WebView ビルド済み CSS（media/assets/index-*.css）。指定時はこれを <style> に使い、従来のインライン CSS は使わない */
  webviewCss?: string;
  /** true のとき body 内に componentCode のみを入れ、外側の <div class="p-6"> でラップしない（React 静的レンダー出力用） */
  noWrap?: boolean;
}

function getDefaultExportStyleBlock(): string {
  return `
    /* 基本的なスタイルリセット */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* HTML要素の基本設定 */
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


    /* フォーム要素の基本リセット */
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

    /* multipleセレクトの選択項目ハイライト保持 */
    select[multiple] option:checked {
      background-color: #3b82f6 !important; /* blue-500 */
      color: #ffffff !important;
    }

    select[multiple] option:checked:not(:focus) {
      background-color: #3b82f6 !important; /* blue-500 */
      color: #ffffff !important;
    }

${getSharedLayoutStyles()}
${getExportCriticalLayoutUtilities()}

    /* バッジ: 高さを最低限統一（sm は固定高さで Public とトピックを揃える） */
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

    .textui-badge-sm {
      font-size: 0.75rem;
      height: 1.25rem;
      padding: 0 0.5rem;
      line-height: 1;
    }

    .textui-badge-md {
      font-size: 0.875rem;
      min-height: 1.5rem;
      padding: 0.25em 0.6em;
    }

    /* Divider: WebView index.css と同一（余白は my-2 / my-4 / my-6 で指定） */
    .textui-divider {
      border: none;
      border-top: 1px solid rgb(75 85 99);
    }
    .textui-divider.vertical {
      margin-left: 1rem;
      margin-right: 1rem;
      border-top: none;
      border-left: 1px solid rgb(75 85 99);
      width: 0;
      height: 1.5rem;
      min-height: 1em;
      vertical-align: middle;
    }

    .textui-badge-default { background-color: rgba(107, 114, 128, 0.25); color: #e5e7eb; }
    .textui-badge-primary { background-color: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .textui-badge-success { background-color: rgba(34, 197, 94, 0.2); color: #86efac; }
    .textui-badge-warning { background-color: rgba(245, 158, 11, 0.22); color: #fcd34d; }
    .textui-badge-error { background-color: rgba(239, 68, 68, 0.2); color: #fca5a5; }


    /* WebView Tabs.tsx と同一: アクティブ bg-gray-800 text-white / 非アクティブ bg-gray-900 text-gray-300 */
    .textui-tabs {
      border-color: rgb(55 65 81);
    }
    .textui-tabs .flex { display: flex; flex-wrap: nowrap; }
    .textui-tabs .flex > button {
      flex-shrink: 0;
      min-height: 2.25rem;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
      background-color: rgb(17 24 39);
      color: rgb(209 213 219);
    }
    .textui-tabs .flex > button:last-child { border-right-width: 0; }
    .textui-tabs .flex > button.textui-tab-active {
      background-color: rgb(31 41 55);
      color: rgb(255 255 255);
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

    .textui-progress-default { background-color: rgba(107, 114, 128, 0.7); }
    .textui-progress-primary { background-color: #3b82f6; }
    .textui-progress-success { background-color: #22c55e; }
    .textui-progress-warning { background-color: #f59e0b; }
    .textui-progress-error { background-color: #ef4444; }

    /* フォーカス時のスタイル（選択項目のハイライトを妨げない） */
    select[multiple]:focus option:checked {
      background-color: #3b82f6 !important; /* blue-500 */
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
  const bodyContent = options?.noWrap
    ? componentCode
    : `  <div class="p-6">\n${componentCode}\n  </div>`;
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TextUI Export</title>
  <style>
${styleContent}
${themeStyles}
  </style>
</head>
<body class="bg-gray-900 text-gray-300 min-h-screen">
${bodyContent}
</body>
</html>`;
}

/**
 * 拡張コードから media/assets を解決し、index-*.css を 1 件読み込む。
 * WebView と同一 CSS を使うことで Export/スクリーンショットの見た目を統一する。
 * - webpack バンドル時: __dirname は out/ になるため base = __dirname/..
 * - 未バンドル時: __dirname は out/exporters の可能性があるため base = __dirname/../..
 * @param fromDir - 基準ディレクトリ。省略時は __dirname から複数候補を試す
 */
export function readWebviewCssIfPresent(fromDir?: string): string | undefined {
  const candidates = fromDir
    ? [path.join(fromDir, 'media', 'assets')]
    : [
        path.join(__dirname, '..', 'media', 'assets'),
        path.join(__dirname, '..', '..', 'media', 'assets')
      ];
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
