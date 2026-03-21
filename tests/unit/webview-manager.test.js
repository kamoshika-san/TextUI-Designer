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
const { getWebViewUpdateManagerForTest } = require('../helpers/webview-update-test-access');

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

    // WebViewManagerをクリーンアップ（安全なdispose処理）
    if (webviewManager && typeof webviewManager.dispose === 'function') {
      try {
        // currentPanelが存在し、disposeメソッドがある場合のみ呼び出し
        if (webviewManager.currentPanel && typeof webviewManager.currentPanel.dispose === 'function') {
          webviewManager.dispose();
        } else {
          // currentPanelを手動でクリアしてからdisposeを呼び出し
          const originalPanel = webviewManager.currentPanel;
          webviewManager.currentPanel = undefined;
          webviewManager.dispose();
          // 必要に応じてパネルの状態をリセット
          if (originalPanel) {
            console.log('[テスト] currentPanelのdisposeメソッドが見つからないため、手動でクリーンアップしました');
          }
        }
      } catch (error) {
        console.warn('[テスト] WebViewManager dispose中にエラーが発生しましたが、テスト実行は続行します:', error.message);
        // テスト環境での軽微なクリーンアップエラーは無視
      }
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

  describe('プレビューからDSLジャンプ', () => {
    const createPositionAt = (content) => (offset) => {
      const safeOffset = Math.max(0, Math.min(offset, content.length));
      const sliced = content.slice(0, safeOffset);
      const lines = sliced.split('\n');
      return {
        line: lines.length - 1,
        character: (lines[lines.length - 1] || '').length
      };
    };

    it('jump-to-dsl メッセージで対応するDSL位置へ移動する', async () => {
      const yamlContent = `page:
  id: jump-test
  components:
    - Text:
        value: "タイトル"
`;
      const doc = {
        fileName: testFilePath,
        getText: () => yamlContent,
        positionAt: createPositionAt(yamlContent)
      };

      const shownEditors = [];
      webviewManager._testHelpers.extendedVscode.workspace.openTextDocument = async () => doc;
      webviewManager._testHelpers.extendedVscode.window.showTextDocument = async (document, column) => {
        const editor = {
          document,
          selection: null,
          revealRange: () => {}
        };
        shownEditors.push({ editor, column });
        return editor;
      };

      webviewManager.setLastTuiFile(testFilePath);
      await webviewManager.openPreview();
      const panel = webviewManager.getPanel();
      assert.ok(panel && typeof panel._messageHandler === 'function', 'WebViewメッセージハンドラーが登録される');

      await panel._messageHandler({
        type: 'jump-to-dsl',
        dslPath: '/page/components/0',
        componentName: 'Text'
      });

      assert.strictEqual(shownEditors.length, 1, 'エディタが開かれる');
      assert.ok(shownEditors[0].editor.selection, '選択位置が設定される');
      assert.strictEqual(shownEditors[0].column, webviewManager._testHelpers.extendedVscode.ViewColumn.One, '左側エディタで表示される');
    });

    it('jump-to-dsl で不正なDSLパスを受けた場合は警告を表示する', async () => {
      const yamlContent = `page:
  id: jump-test
  components:
    - Text:
        value: "タイトル"
`;
      const doc = {
        fileName: testFilePath,
        getText: () => yamlContent,
        positionAt: createPositionAt(yamlContent)
      };
      const warnings = [];
      let openedEditor = null;
      webviewManager._testHelpers.extendedVscode.workspace.openTextDocument = async () => doc;
      webviewManager._testHelpers.extendedVscode.window.showTextDocument = async () => {
        openedEditor = {
          selection: null,
          revealRange: () => {}
        };
        return openedEditor;
      };
      const captureWarning = async (message) => {
        warnings.push(message);
      };
      webviewManager._testHelpers.extendedVscode.window.showWarningMessage = captureWarning;
      if (global.vscode && global.vscode.window) {
        global.vscode.window.showWarningMessage = captureWarning;
      }
      try {
        const sharedVscodeMock = require('../mocks/vscode-mock');
        if (sharedVscodeMock && sharedVscodeMock.window) {
          sharedVscodeMock.window.showWarningMessage = captureWarning;
        }
      } catch (_error) {
        // no-op for isolated runs
      }

      webviewManager.setLastTuiFile(testFilePath);
      await webviewManager.openPreview();
      const panel = webviewManager.getPanel();
      assert.ok(panel && typeof panel._messageHandler === 'function', 'WebViewメッセージハンドラーが登録される');

      await panel._messageHandler({
        type: 'jump-to-dsl',
        dslPath: '/page/components/99',
        componentName: 'Text'
      });

      assert.ok(
        warnings.length > 0 || openedEditor?.selection === null,
        '解決できないDSLパスでは警告表示または選択未変更となる'
      );
    });
  });

  describe('lastParsedData の管理', () => {
    it('setterで設定した値をgetterで取得できる', () => {
      const testPath = '/path/to/parsed.tui.yml';
      const parsedData = {
        page: {
          id: 'parsed-test-page',
          title: 'Parsed Test',
          layout: 'vertical',
          components: []
        }
      };

      webviewManager.setLastTuiFile(testPath);
      const updateMgr = getWebViewUpdateManagerForTest(webviewManager);
      updateMgr.lastParsedData = parsedData;

      assert.deepStrictEqual(
        updateMgr.lastParsedData,
        parsedData,
        'lastParsedData の read/write 契約が成立している'
      );
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

  describe('テーマ切り替え機能のテスト', () => {
    let mockThemeManager;
    const wait = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));

    beforeEach(() => {
      // ThemeManagerのモック作成
      mockThemeManager = {
        _themePath: '',
        loadTheme: async () => {},
        generateCSSVariables: () => 'mock-css-variables',
        getThemePath() {
          return this._themePath;
        },
        setThemePath(themePath) {
          this._themePath = themePath || '';
        }
      };
      
      // WebViewManagerにThemeManagerを設定
      webviewManager.themeManager = mockThemeManager;
      if (webviewManager.messageHandler) {
        webviewManager.messageHandler.themeManager = mockThemeManager;
      }
    });

    it('利用可能なテーマ一覧を正しく検出する', async () => {
      const themeDir = path.join(__dirname, '../fixtures/sample');
      const themeFile1 = path.join(themeDir, 'test-theme.yml');
      const themeFile2 = path.join(themeDir, 'custom-theme.yml');

      try {
        if (!fs.existsSync(themeDir)) {
          fs.mkdirSync(themeDir, { recursive: true });
        }

        fs.writeFileSync(themeFile1, `theme:
   name: "Test Theme"
   description: "A test theme"
   version: "1.0.0"`);

        fs.writeFileSync(themeFile2, `theme:
   name: "Custom Theme"
   description: "A custom theme"
   version: "1.0.0"`);

        webviewManager._testHelpers.extendedVscode.workspace.workspaceFolders = [{
          uri: { fsPath: path.dirname(themeDir) }
        }];

        await webviewManager.openPreview();
        const panel = webviewManager.getPanel();
        assert.ok(panel, 'WebViewパネルが作成される');

        let sentMessage = null;
        panel.webview.postMessage = (message) => {
          if (message.type === 'available-themes') {
            sentMessage = message;
          }
          return Promise.resolve(true);
        };

        await webviewManager.sendAvailableThemes();
        await wait(50);

        assert.ok(sentMessage, 'available-themesメッセージが送信される');
        assert.strictEqual(sentMessage.type, 'available-themes', 'メッセージタイプが正しい');
        assert.ok(Array.isArray(sentMessage.themes), 'テーマ配列が含まれている');

        const names = sentMessage.themes.map(theme => theme.name);
        assert.ok(names.includes('デフォルト'), 'デフォルトテーマが含まれる');
        assert.ok(names.includes('Test Theme'), '作成したテーマ1が含まれる');
        assert.ok(names.includes('Custom Theme'), '作成したテーマ2が含まれる');
      } finally {
        if (fs.existsSync(themeFile1)) {fs.unlinkSync(themeFile1);}
        if (fs.existsSync(themeFile2)) {fs.unlinkSync(themeFile2);}
        if (fs.existsSync(themeDir)) {fs.rmSync(themeDir, { recursive: true, force: true });}
      }
    });

    it('テーマ切り替えメッセージ処理が正しく動作する', async () => {
      await webviewManager.openPreview();
      const panel = webviewManager.getPanel();
      assert.ok(panel, 'WebViewパネルが作成される');

      let appliedCSS = null;
      panel.webview.postMessage = (message) => {
        if (message.type === 'theme-variables') {
          appliedCSS = message.css;
        }
        return Promise.resolve(true);
      };

      const handler = panel._messageHandler;
      assert.strictEqual(typeof handler, 'function', 'メッセージハンドラーが登録されている');
      await handler({ type: 'theme-switch', themePath: '' });
      await wait(20);

      assert.strictEqual(appliedCSS, '', 'デフォルトテーマ切り替えでCSSがリセットされる');
    });

    it('デフォルトテーマへの切り替えが正しく動作する', async () => {
      let appliedCSS = null;
      await webviewManager.openPreview();
      const panel = webviewManager.getPanel();
      assert.ok(panel, 'WebViewパネルが作成される');
      panel.webview.postMessage = (message) => {
        if (message.type === 'theme-variables') {
          appliedCSS = message.css;
        }
        return Promise.resolve(true);
      };

      // 空文字でデフォルトテーマに切り替え
      await webviewManager.switchTheme('');

      // デフォルトテーマの場合は空文字列が適用されることを確認
      assert.strictEqual(appliedCSS, '', 'デフォルトテーマのCSS変数がリセットされる');
    });

    it('無効なテーマパスでエラーハンドリングが正しく動作する', async () => {
      // ワークスペースフォルダーのモック設定
      webviewManager._testHelpers.extendedVscode.workspace.workspaceFolders = [{
        uri: { fsPath: '/nonexistent/path' }
      }];

      await webviewManager.openPreview();
      const panel = webviewManager.getPanel();
      assert.ok(panel, 'WebViewパネルが作成される');

      // 存在しないテーマファイルで切り替えを試行
      const result = await webviewManager.switchTheme('nonexistent-theme.yml');
      assert.strictEqual(result, undefined, '無効なテーマパスでも例外を投げずに終了する');
    });

    it('ThemeManagerが未設定の場合のエラーハンドリング', async () => {
      // ThemeManagerを未設定にする
      webviewManager.themeManager = undefined;
      if (webviewManager.messageHandler) {
        webviewManager.messageHandler.themeManager = undefined;
      }
      await webviewManager.openPreview();
      const panel = webviewManager.getPanel();
      assert.ok(panel, 'WebViewパネルが作成される');

      // テーマ切り替えを試行
      const result = await webviewManager.switchTheme('test-theme.yml');
      assert.strictEqual(result, undefined, 'ThemeManager未設定でも例外を投げずに終了する');
    });
  });

  describe('メモリ管理機能のテスト', () => {
    let originalProcessMemoryUsage;

    beforeEach(() => {
      // process.memoryUsageをモック
      originalProcessMemoryUsage = process.memoryUsage;
    });

    afterEach(() => {
      // process.memoryUsageを復元
      process.memoryUsage = originalProcessMemoryUsage;
    });

         it('150MB以上でキャッシュが強制クリアされる', async () => {
       const updateMgr = getWebViewUpdateManagerForTest(webviewManager);
       // 150MB以上のメモリ使用量をシミュレート
       process.memoryUsage = () => ({
         heapUsed: 160 * 1024 * 1024, // 160MB
         heapTotal: 200 * 1024 * 1024,
         external: 10 * 1024 * 1024,
         rss: 200 * 1024 * 1024
       });

       // キャッシュにデータを設定
       updateMgr._setYamlCacheContent('test content');

       // テスト用メソッドを直接実行
       updateMgr._testMemoryManagement();

       // キャッシュがクリアされていることを確認
       assert.strictEqual(updateMgr._getYamlCacheContent(), '', 'YAMLキャッシュがクリアされた');
     });

         it('100-150MBでキャッシュが予防的にクリアされる', async () => {
       const updateMgr = getWebViewUpdateManagerForTest(webviewManager);
       // 100-150MBのメモリ使用量をシミュレート
       process.memoryUsage = () => ({
         heapUsed: 120 * 1024 * 1024, // 120MB
         heapTotal: 150 * 1024 * 1024,
         external: 10 * 1024 * 1024,
         rss: 150 * 1024 * 1024
       });

       // キャッシュにデータを設定
       updateMgr._setYamlCacheContent('test content');

       // テスト用メソッドを直接実行
       updateMgr._testMemoryManagement();

       // キャッシュがクリアされていることを確認
       assert.strictEqual(updateMgr._getYamlCacheContent(), '', 'YAMLキャッシュがクリアされた');
     });

         it('50-100MBではキャッシュが保持される', async () => {
       const updateMgr = getWebViewUpdateManagerForTest(webviewManager);
       // 50-100MBのメモリ使用量をシミュレート
       process.memoryUsage = () => ({
         heapUsed: 70 * 1024 * 1024, // 70MB
         heapTotal: 100 * 1024 * 1024,
         external: 10 * 1024 * 1024,
         rss: 100 * 1024 * 1024
       });

       // キャッシュにデータを設定
       const testContent = 'test content';
       updateMgr._setYamlCacheContent(testContent);

       // テスト用メソッドを直接実行
       updateMgr._testMemoryManagement();

       // キャッシュが保持されていることを確認
       assert.strictEqual(updateMgr._getYamlCacheContent(), testContent, 'YAMLキャッシュが保持されている');
     });

         it('50MB未満ではキャッシュが完全に保持される', async () => {
       const updateMgr = getWebViewUpdateManagerForTest(webviewManager);
       // 50MB未満のメモリ使用量をシミュレート
       process.memoryUsage = () => ({
         heapUsed: 30 * 1024 * 1024, // 30MB
         heapTotal: 50 * 1024 * 1024,
         external: 5 * 1024 * 1024,
         rss: 50 * 1024 * 1024
       });

       // キャッシュにデータを設定
       const testContent = 'test content';
       updateMgr._setYamlCacheContent(testContent);

       // テスト用メソッドを直接実行
       updateMgr._testMemoryManagement();

       // キャッシュが完全に保持されていることを確認
       assert.strictEqual(updateMgr._getYamlCacheContent(), testContent, 'YAMLキャッシュが完全に保持されている');
     });
  });
}); 
