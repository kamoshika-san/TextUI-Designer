/**
 * WebViewManager の単体テスト
 * 
 * WebViewの管理機能に関連する処理をテストします
 */

// グローバルにモックを設定
global.vscode = global.vscode || {};

const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('WebViewManager 単体テスト', () => {
  let webviewManager;
  let testFilePath;

  beforeEach(async () => {
    // ファクトリからWebViewManagerを作成
    global.cleanupMocks();
    
    if (!global.WebViewManagerFactory || typeof global.WebViewManagerFactory.createForTest !== 'function') {
      const path = require('path');
      const factoryPath = path.resolve(__dirname, '../mocks/webview-manager-factory.js');
      const { WebViewManagerFactory } = require(factoryPath);
      global.WebViewManagerFactory = WebViewManagerFactory;
    }
    
    webviewManager = global.WebViewManagerFactory.createForTest(global.vscode, {
      enablePerformance: true,
      cacheTTL: 300000,
      maxCacheSize: 100
    });

    // テスト用ファイルを作成
    testFilePath = webviewManager._testHelpers.createTestFile(`page:
  id: webview-test
  title: "WebViewテスト"
  layout: vertical
  components:
    - Text:
        variant: h1
        value: "WebViewテストタイトル"`);
  });

  afterEach(async () => {
    // テストファイルを削除
    if (webviewManager && webviewManager._testHelpers) {
      webviewManager._testHelpers.cleanupTestFile(testFilePath);
      webviewManager._testHelpers.resetAllMocks();
      webviewManager._testHelpers.restoreRequire();
    }

    // WebViewManagerをクリーンアップ
    if (webviewManager && typeof webviewManager.dispose === 'function') {
      webviewManager.dispose();
    }

    global.cleanupMocks();
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