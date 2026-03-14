import { getSharedLayoutStyles } from '../shared/layout-styles';

export function buildHtmlDocument(componentCode: string, themeStyles: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TextUI Export</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    /* VS Codeテーマの影響を排除 */
    :root {
      all: unset;
    }

    /* 基本的なスタイルリセット（Tailwind CSSを妨げない程度） */
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
      color: #cccccc;
      background-color: #1e1e1e;
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


    .textui-badge {
      display: inline-block;
      padding: 0.25em 0.6em;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.2;
    }

    .textui-badge-sm {
      font-size: 0.75rem;
      padding: 0.15em 0.5em;
    }

    .textui-badge-md {
      font-size: 0.875rem;
      padding: 0.25em 0.6em;
    }

    .textui-badge-default { background-color: rgba(107, 114, 128, 0.25); color: #e5e7eb; }
    .textui-badge-primary { background-color: rgba(59, 130, 246, 0.2); color: #93c5fd; }
    .textui-badge-success { background-color: rgba(34, 197, 94, 0.2); color: #86efac; }
    .textui-badge-warning { background-color: rgba(245, 158, 11, 0.22); color: #fcd34d; }
    .textui-badge-error { background-color: rgba(239, 68, 68, 0.2); color: #fca5a5; }


    .textui-progress {
      display: block;
      width: 100%;
      max-width: 32rem;
      margin-bottom: 0.75rem;
    }

    .textui-progress-header {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      margin-bottom: 0.25rem;
      font-size: 0.875rem;
      color: #d1d5db;
    }

    .textui-progress-track {
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
${themeStyles}
  </style>
</head>
<body class="bg-gray-900 text-gray-300 min-h-screen">
  <div class="p-6">
${componentCode}
  </div>
</body>
</html>`;
}
