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


function generateNonce(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < length; i++) {
    nonce += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return nonce;
}

/**
 * WebViewのHTMLコンテンツを生成
 */
export function getWebviewContent(context: vscode.ExtensionContext, panel?: vscode.WebviewPanel): string {
  const nonce = generateNonce();
  const cspSource = panel ? panel.webview.cspSource : "'none'";

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
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'nonce-${nonce}'; script-src ${cspSource} 'nonce-${nonce}'; font-src ${cspSource} https:; connect-src ${cspSource};">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TextUI Preview</title>
  <link rel="stylesheet" href="${cssUri}">
  <style nonce="${nonce}">
    /* VS Codeテーマ変数を無効化 */
    :root {
      --vscode-foreground: unset !important;
      --vscode-background: unset !important;
      --vscode-editor-foreground: unset !important;
      --vscode-editor-background: unset !important;
    }
    
  </style>
  <!-- テーマ変数はビルドされたCSSの後に適用される -->
  <style id="theme-vars" nonce="${nonce}"></style>
</head>
<body>
  <div id="root">
    <div class="textui-preview-empty">
      <h2 class="textui-preview-empty-title">TextUI Designer Preview</h2>
      <p class="textui-preview-empty-message">YAMLファイルを開いてプレビューを表示してください。</p>
    </div>
  </div>
  
  <script nonce="${nonce}">
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
  
  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
}

/**
 * エラーメッセージ用のHTMLを生成
 */
export function getErrorHtml(message: string): string {
  const safeMessage = escapeHtml(message);
  return `
    <div class="textui-error-container">
      <h2 class="textui-error-title">エラーが発生しました</h2>
      <p class="textui-error-message">${safeMessage}</p>
      <p class="textui-error-help">
        YAMLファイルの構文を確認してください。
      </p>
    </div>
  `;
} 
