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

    /* フォーカス時のスタイル（選択項目のハイライトを妨げない） */
    select[multiple]:focus option:checked {
      background-color: #3b82f6 !important; /* blue-500 */
      color: #ffffff !important;
    }
${themeStyles}
  </style>
</head>
<body class="bg-gray-900 text-gray-300 min-h-screen">
  <div class="container mx-auto p-6">
${componentCode}
  </div>
</body>
</html>`;
}
