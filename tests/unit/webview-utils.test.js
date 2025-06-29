/**
 * WebViewUtilsの基本テスト
 */

const assert = require('assert');
const { describe, it } = require('mocha');

// VSCode APIのモック
const mockVscode = {
  ExtensionContext: class {
    constructor() {
      this.extensionPath = __dirname + '/../../';
    }
  },
  Uri: {
    file: (path) => ({ toString: () => `file://${path}` })
  },
  WebviewPanel: class {
    constructor() {
      this.webview = {
        asWebviewUri: (uri) => uri.toString()
      };
    }
  }
};

global.vscode = mockVscode;

const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return mockVscode;
  }
  return originalRequire.apply(this, arguments);
};

const { getWebviewContent, getErrorHtml } = require('../../out/utils/webview-utils.js');

describe('WebViewUtils', () => {
  describe('postMessage用データの整形', () => {
    it('WebViewコンテンツが正しく生成される', () => {
      const context = new mockVscode.ExtensionContext();
      const panel = new mockVscode.WebviewPanel();
      
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
      assert.ok(errorHtml.includes('color: #ef4444'));
      assert.ok(errorHtml.includes('color: #fca5a5'));
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
      const context = new mockVscode.ExtensionContext();
      const content = getWebviewContent(context);
      
      // CSSリンクが含まれている
      assert.ok(content.includes('link rel="stylesheet"'));
      
      // インラインスタイルが含まれている
      assert.ok(content.includes('body {'));
      assert.ok(content.includes('#root {'));
      
      // VS Codeテーマ変数の無効化が含まれている
      assert.ok(content.includes('--vscode-foreground: unset'));
      assert.ok(content.includes('--vscode-background: unset'));
    });

    it('メッセージ処理の分岐が正しく実装されている', () => {
      const context = new mockVscode.ExtensionContext();
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