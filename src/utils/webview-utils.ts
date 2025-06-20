import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * WebViewのHTMLコンテンツを生成
 */
export function getWebviewContent(context: vscode.ExtensionContext, panel?: vscode.WebviewPanel): string {
  // CSSファイルのパスを取得
  const cssPath = path.join(context.extensionPath, 'media', 'assets');
  const cssFiles = fs.readdirSync(cssPath).filter(file => file.endsWith('.css'));
  const latestCssFile = cssFiles.sort().pop();
  const cssUri = panel ? panel.webview.asWebviewUri(vscode.Uri.file(path.join(cssPath, latestCssFile || 'index.css'))) : '';

  // JavaScriptファイルのパスを取得
  const jsPath = path.join(context.extensionPath, 'media');
  const jsFiles = fs.readdirSync(jsPath).filter(file => file.endsWith('.js'));
  const latestJsFile = jsFiles.sort().pop();
  const jsUri = panel ? panel.webview.asWebviewUri(vscode.Uri.file(path.join(jsPath, latestJsFile || 'webview.js'))) : '';

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
    
    /* エクスポートボタンのスタイル */
    .export-button {
      position: fixed;
      top: 1rem;
      right: 1rem;
      background-color: rgba(75, 85, 99, 0.8);
      color: #d1d5db;
      border: 1px solid rgba(107, 114, 128, 0.5);
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.2s;
      z-index: 1000;
    }
    
    .export-button:hover {
      background-color: rgba(55, 65, 81, 0.9);
      border-color: rgba(75, 85, 99, 0.7);
    }
  </style>
</head>
<body>
  <button class="export-button" onclick="exportToCode()">Export</button>
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
        postMessage: (message) => console.log('[WebView] ダミーpostMessage:', message)
      };
      window.vscode = vscode;
    }
    
    // エクスポート関数
    function exportToCode() {
      if (vscode && vscode.postMessage) {
        vscode.postMessage({ type: 'export' });
      }
    }
    
    // メッセージ受信処理
    window.addEventListener('message', event => {
      const message = event.data;
      
      console.log('[WebView] メッセージを受信:', message);
      
      switch (message.type) {
        case 'update':
          // Reactアプリにデータを送信
          console.log('[WebView] updateメッセージを処理:', message.data);
          window.postMessage({ type: 'json', json: message.data }, '*');
          break;
        case 'error':
          // エラーメッセージを表示
          console.log('[WebView] errorメッセージを処理:', message.message);
          window.postMessage({ type: 'error', error: message.message }, '*');
          break;
        case 'schema-error':
          // スキーマエラーメッセージを表示
          console.log('[WebView] schema-errorメッセージを処理:', message.errors);
          window.postMessage({ type: 'schema-error', errors: message.errors }, '*');
          break;
        case 'openDevTools':
          // 開発者ツールを開く（開発モードのみ）
          if (process.env.NODE_ENV === 'development') {
            // 開発者ツールを開く処理
          }
          break;
        default:
          console.log('[WebView] 未対応のメッセージタイプ:', message.type);
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
  return `
    <div style="padding: 2rem; text-align: center;">
      <h2 style="color: #ef4444;">エラーが発生しました</h2>
      <p style="color: #fca5a5; margin: 1rem 0;">${message}</p>
      <p style="color: #9ca3af; font-size: 0.875rem;">
        YAMLファイルの構文を確認してください。
      </p>
    </div>
  `;
} 