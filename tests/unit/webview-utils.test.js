/**
 * WebViewUtilsの基本テスト
 *
 * E6-S3-T1: tests/setup.js 経由の vscode モックを使用し、本ファイル専用の
 * Module.prototype.require フックは置かない（docs/test-setup-policy.md）。
 */

const assert = require('assert');
const path = require('path');


// tests/setup.js が差し替えた require('vscode')
const vscode = require('vscode');

/** getWebviewContent が参照する extension ルート（リポジトリ直下） */
class TestExtensionContext {
  constructor() {
    this.extensionPath = path.resolve(__dirname, '..', '..');
  }
}

/**
 * vscode-mock の MockWebviewPanel は本番 API の一部のみ。
 * webview-utils が要求する cspSource / asWebviewUri をテスト側で明示補完する（グローバル require フックは使わない）。
 */
function createTestWebviewPanel() {
  const panel = vscode.window.createWebviewPanel(
    'textui-test',
    'Test',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );
  if (!panel.webview.cspSource) {
    panel.webview.cspSource = 'https://*.vscode-cdn.net';
  }
  if (typeof panel.webview.asWebviewUri !== 'function') {
    panel.webview.asWebviewUri = (uri) => uri.toString();
  }
  return panel;
}

const { getWebviewContent, getErrorHtml } = require('../../out/utils/webview-utils.js');

describe('WebViewUtils', () => {
  describe('postMessage用データの整形', () => {
    it('WebViewコンテンツが正しく生成される', () => {
      const context = new TestExtensionContext();
      const panel = createTestWebviewPanel();

      const content = getWebviewContent(context, panel);

      // HTMLの基本構造が含まれている
      assert.ok(content.includes('<!DOCTYPE html>'));
      assert.ok(content.includes('<html lang="ja">'));
      assert.ok(content.includes('<title>TextUI Preview</title>'));
      assert.ok(content.includes('<div id="root">'));

      // VS Code APIの取得処理が含まれている
      assert.ok(content.includes('acquireVsCodeApi()'));
      assert.ok(content.includes('postMessage'));

      // メッセージ受信処理が含まれている
      assert.ok(content.includes('addEventListener(\'message\''));
      assert.ok(content.includes('message.type'));
    });

    it('エラーメッセージ用HTMLが正しく生成される', () => {
      const errorMessage = 'Test error message';
      const errorHtml = getErrorHtml(errorMessage);

      // エラーメッセージが含まれている
      assert.ok(errorHtml.includes(errorMessage));
      assert.ok(errorHtml.includes('エラーが発生しました'));

      // HTML構造が正しい
      assert.ok(errorHtml.includes('<div'));
      assert.ok(errorHtml.includes('<h2'));
      assert.ok(errorHtml.includes('<p'));

      // スタイルが適用されている
      assert.ok(errorHtml.includes('textui-error-title'));
      assert.ok(errorHtml.includes('textui-error-message'));
    });
  });

  describe('HTMLエスケープ', () => {
    it('特殊文字が正しくエスケープされる', () => {
      const dangerousMessage = '<script>alert("XSS")</script>';
      const errorHtml = getErrorHtml(dangerousMessage);
      // エスケープ後の文字列が含まれている
      assert.ok(errorHtml.includes('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'));
      // <script>タグがそのまま含まれていない
      assert.ok(!errorHtml.includes('<script>'));
      assert.ok(!errorHtml.includes('</script>'));
    });

    it('HTMLタグが正しくエスケープされる', () => {
      const htmlMessage = '<div>Test</div><span>Content</span>';
      const errorHtml = getErrorHtml(htmlMessage);
      // エスケープ後の文字列が含まれている
      assert.ok(errorHtml.includes('&lt;div&gt;Test&lt;/div&gt;&lt;span&gt;Content&lt;/span&gt;'));
      // タグがそのまま含まれていない
      assert.ok(!errorHtml.includes('<div>'));
      assert.ok(!errorHtml.includes('<span>'));
    });
  });

  describe('WebViewコンテンツの構造', () => {
    it('必要なスクリプトとスタイルが含まれている', () => {
      const context = new TestExtensionContext();
      const content = getWebviewContent(context);

      // CSSリンクが含まれている
      assert.ok(content.includes('link rel="stylesheet"'));

      // インラインスタイルが含まれている
      assert.ok(content.includes('Content-Security-Policy'));
      assert.ok(content.includes('nonce='));
      assert.ok(content.includes('<style id="theme-vars"'));

      // VS Codeテーマ変数の無効化が含まれている
      assert.ok(content.includes('--vscode-foreground: unset'));
      assert.ok(content.includes('--vscode-background: unset'));
      const startupStyleMatch = content.match(/<style nonce="[^"]+">([\s\S]*?)<\/style>/);
      assert.ok(startupStyleMatch);
      const startupStyle = startupStyleMatch[1];
      assert.ok(!startupStyle.includes('body {'));
      assert.ok(!startupStyle.includes('#root {'));
      assert.ok(!startupStyle.includes('.textui-preview-empty {'));
      assert.ok(!startupStyle.includes('.textui-error-container {'));
    });

    it('メッセージ処理の分岐が正しく実装されている', () => {
      const context = new TestExtensionContext();
      const content = getWebviewContent(context);

      // 各メッセージタイプの処理が含まれている
      assert.ok(content.includes('case \'update\''));
      assert.ok(content.includes('case \'error\''));
      assert.ok(content.includes('case \'schema-error\''));
      assert.ok(content.includes('case \'openDevTools\''));

      // デフォルトケースが含まれている
      assert.ok(content.includes('default:'));
    });
  });
});
