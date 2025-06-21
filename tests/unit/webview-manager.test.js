/**
 * WebViewManager の単体テスト
 * 
 * WebViewの管理機能に関連する処理をテストします
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('WebViewManager 単体テスト', () => {
  let webviewManager;
  let testFile;
  let testFilePath;
  let mockContext;

  before(async () => {
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