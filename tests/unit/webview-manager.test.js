/**
 * WebViewManager の単体テスト
 * 
 * WebViewの管理機能に関連する処理をテストします
 */

const Module = require('module');
let originalRequire = Module.prototype.require;

// VS Code APIのモック
const mockVscode = {
  window: {
    activeTextEditor: null,
    createWebviewPanel: () => ({
      webview: {
        html: '',
        postMessage: () => {},
        onDidReceiveMessage: () => ({ dispose: () => {} })
      },
      onDidDispose: () => ({ dispose: () => {} }),
      reveal: () => {},
      dispose: () => {}
    })
  },
  workspace: {
    getConfiguration: () => ({
      get: (key, defaultValue) => {
        // パフォーマンス設定のデフォルト値を返す
        const defaults = {
          'textui.performance.enabled': true,
          'textui.performance.cacheTTL': 300000,
          'textui.performance.maxCacheSize': 100,
          'textui.performance.monitoringEnabled': true,
          'textui.performance.forceEnabled': false
        };
        return defaults[key] !== undefined ? defaults[key] : defaultValue;
      }
    }),
    openTextDocument: () => Promise.resolve({
      getText: () => 'test content'
    })
  },
  ViewColumn: {
    One: 1,
    Two: 2
  },
  Uri: {
    file: (path) => ({ fsPath: path })
  }
};

// グローバルにモックを設定
global.vscode = mockVscode;

const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('WebViewManager 単体テスト', () => {
  let webviewManager;
  let testFile;
  let testFilePath;
  let mockContext;

  before(async () => {
    originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === 'vscode') {
        return mockVscode;
      }
      return originalRequire.apply(this, arguments);
    };

    // テスト用の.tui.ymlファイルを作成
    testFile = `page:
  id: webview-test
  title: "WebViewテスト"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "WebViewテストタイトル"`;

    testFilePath = path.join(__dirname, 'webview-test.tui.yml');
    fs.writeFileSync(testFilePath, testFile, 'utf-8');

    // Mock contextを作成
    mockContext = {
      extensionUri: { fsPath: __dirname },
      subscriptions: []
    };

    // WebViewManagerをインポートしてテスト用インスタンスを作成
    const { WebViewManager } = require('../../out/services/webview-manager');
    webviewManager = new WebViewManager(mockContext);
  });

  after(async () => {
    // テストファイルを削除
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }

    // WebViewManagerをクリーンアップ
    if (webviewManager) {
      webviewManager.dispose();
    }

    // PerformanceMonitorのインスタンスをクリーンアップ
    const { PerformanceMonitor } = require('../../out/utils/performance-monitor');
    const performanceMonitor = PerformanceMonitor.getInstance();
    if (performanceMonitor && typeof performanceMonitor.dispose === 'function') {
      performanceMonitor.dispose();
    }

    Module.prototype.require = originalRequire;
  });

  describe('lastTuiFile の管理', () => {
    it('setLastTuiFileとgetLastTuiFileが正しく動作する', () => {
      const testPath = '/path/to/test.tui.yml';
      webviewManager.setLastTuiFile(testPath);
      assert.strictEqual(webviewManager.getLastTuiFile(), testPath);
    });

    it('lastTuiFileが正しく更新される', () => {
      const path1 = '/path/to/first.tui.yml';
      const path2 = '/path/to/second.tui.yml';
      
      webviewManager.setLastTuiFile(path1);
      assert.strictEqual(webviewManager.getLastTuiFile(), path1);
      
      webviewManager.setLastTuiFile(path2);
      assert.strictEqual(webviewManager.getLastTuiFile(), path2);
    });
  });

  describe('WebViewの状態管理', () => {
    it('hasPanelが正しく動作する', () => {
      // 初期状態ではパネルが存在しない
      assert.strictEqual(webviewManager.hasPanel(), false);
    });

    it('getPanelが正しく動作する', () => {
      // 初期状態ではパネルがnull
      assert.strictEqual(webviewManager.getPanel(), undefined);
    });
  });

  describe('ファイル操作のテスト', () => {
    it('テストファイルが正しく作成される', () => {
      assert.ok(fs.existsSync(testFilePath), 'テストファイルが正しく作成されました');
    });

    it('テストファイルの内容が正しい', () => {
      const content = fs.readFileSync(testFilePath, 'utf-8');
      assert.ok(content.includes('webview-test'), 'ファイル内容にIDが含まれています');
      assert.ok(content.includes('WebViewテスト'), 'ファイル内容にタイトルが含まれています');
    });
  });
}); 