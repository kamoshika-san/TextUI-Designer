import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * HTMLエスケープ関数
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * WebViewのHTMLコンテンツを生成
 */
export function getWebviewContent(context: vscode.ExtensionContext, panel?: vscode.WebviewPanel): string {
  // CSSファイルのパスを取得
  const cssPath = path.join(context.extensionPath, 'media', 'assets');
  let cssFiles: string[] = [];
  try {
    cssFiles = fs.readdirSync(cssPath).filter(file => file.endsWith('.css'));
  } catch (error) {
    console.warn(`[getWebviewContent] Failed to read CSS directory: ${cssPath}`, error);
  }
  const latestCssFile = cssFiles.sort().pop() || 'index.css';
  const cssUri = panel ? panel.webview.asWebviewUri(vscode.Uri.file(path.join(cssPath, latestCssFile))) : '';

  // JavaScriptファイルのパスを取得
  const jsPath = path.join(context.extensionPath, 'media');
  let jsFiles: string[] = [];
  try {
    jsFiles = fs.readdirSync(jsPath).filter(file => file.endsWith('.js'));
  } catch (error) {
    console.warn(`[getWebviewContent] Failed to read JS directory: ${jsPath}`, error);
  }
  const latestJsFile = jsFiles.sort().pop() || 'webview.js';
  const jsUri = panel ? panel.webview.asWebviewUri(vscode.Uri.file(path.join(jsPath, latestJsFile))) : '';

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TextUI Preview</title>
  <link rel="stylesheet" href="${cssUri}">
  <style>
    /* VS Codeテーマ変数を無効化 */
    :root {
      --vscode-foreground: unset !important;
      --vscode-background: unset !important;
      --vscode-editor-foreground: unset !important;
      --vscode-editor-background: unset !important;
    }
    
    body {
      margin: 0;
      padding: 0;
      background-color: #1e1e1e;
      color: #cccccc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    
    #root {
      padding: 1rem;
    }
  </style>
  <!-- テーマ変数はビルドされたCSSの後に適用される -->
  <style id="theme-vars"></style>
</head>
<body>
  <div id="root">
    <div style="text-align: center; padding: 2rem;">
      <h2>TextUI Designer Preview</h2>
      <p>YAMLファイルを開いてプレビューを表示してください。</p>
    </div>
  </div>
  
  <script>
    // VS Code APIの取得（一度だけ）
    let vscode;
    try {
      vscode = acquireVsCodeApi();
      window.vscode = vscode;
    } catch (error) {
      console.error('[WebView] VS Code APIの取得に失敗:', error);
      // エラーが発生した場合はダミーオブジェクトを作成
      vscode = {
        postMessage: (message) => {
          // ダミーpostMessage（テスト用）
        }
      };
      window.vscode = vscode;
    }
    
    // メッセージ受信処理
    window.addEventListener('message', event => {
      const message = event.data;
      
      switch (message.type) {
        case 'update':
          // Reactアプリにデータを送信
          window.postMessage({ type: 'json', json: message.data }, '*');
          break;
        case 'error':
          // エラーメッセージを表示
          window.postMessage({ type: 'error', error: message.message }, '*');
          break;
        case 'schema-error':
          // スキーマエラーメッセージを表示
          window.postMessage({ type: 'schema-error', errors: message.errors }, '*');
          break;
        case 'openDevTools':
          // 開発者ツールを開く（開発モードのみ）
          if (process.env.NODE_ENV === 'development') {
            // 開発者ツールを開く処理
          }
          break;
        default:
          // 未対応のメッセージタイプ
          break;
      }
    });
  </script>
  
  <script src="${jsUri}"></script>
</body>
</html>`;
}

/**
 * エラーメッセージ用のHTMLを生成
 */
export function getErrorHtml(message: string): string {
  const safeMessage = escapeHtml(message);
  return `
    <div style="padding: 2rem; text-align: center;">
      <h2 style="color: #ef4444;">エラーが発生しました</h2>
      <p style="color: #fca5a5; margin: 1rem 0;">${safeMessage}</p>
      <p style="color: #9ca3af; font-size: 0.875rem;">
        YAMLファイルの構文を確認してください。
      </p>
    </div>
  `;
} 