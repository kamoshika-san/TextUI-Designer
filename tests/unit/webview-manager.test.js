/**
 * WebViewManager の単体テスト
 * 
 * WebViewの管理機能に関連する処理をテストします
 */

const assert = require('assert');
/** setup.js の require フックと同一のモック（ViewColumn 等が常に揃う） */
const vscode = require('../mocks/vscode-mock.js');
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
    
    webviewManager = global.WebViewManagerFactory.createForTest(vscode, {
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
      if (vscode && vscode.window) {
        vscode.window.showWarningMessage = captureWarning;
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

  describe('解析済み DSL キャッシュ（テストアダプタ）', () => {
    it('setParsedData で設定した値を getParsedData で取得できる', () => {
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
      const yamlTest = updateMgr.createYamlCacheTestAdapter();
      yamlTest.setParsedData(parsedData);

      assert.deepStrictEqual(
        yamlTest.getParsedData(),
        parsedData,
        'createYamlCacheTestAdapter 経由の read/write 契約が成立している'
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
        _themePath: undefined,
        loadTheme: async () => {},
        generateCSSVariables: () => 'mock-css-variables',
        getThemePath() {
          return this._themePath;
        },
        setThemePath(themePath) {
          this._themePath = themePath;
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
    it('cross-folder switch reloads the folder theme and same-folder switch preserves manual selection', async () => {
      const waitForSync = (ms = 50) => new Promise(resolve => setTimeout(resolve, ms));
      const workspaceRoot = fs.mkdtempSync(path.join(__dirname, '../fixtures/theme-switch-'));
      const folderA = path.join(workspaceRoot, 'folder-a');
      const folderB = path.join(workspaceRoot, 'folder-b');
      fs.mkdirSync(folderA, { recursive: true });
      fs.mkdirSync(folderB, { recursive: true });

      const folderATheme = path.join(folderA, 'textui-theme.yml');
      const manualTheme = path.join(folderA, 'manual-theme.yml');
      const folderAFile = path.join(folderA, 'first.tui.yml');
      const sameFolderFile = path.join(folderA, 'second.tui.yml');
      const folderBFile = path.join(folderB, 'third.tui.yml');

      fs.writeFileSync(folderATheme, 'theme:\n  name: "Folder A"');
      fs.writeFileSync(manualTheme, 'theme:\n  name: "Manual Theme"');
      fs.writeFileSync(folderAFile, 'page:\n  id: first\n  components: []');
      fs.writeFileSync(sameFolderFile, 'page:\n  id: second\n  components: []');
      fs.writeFileSync(folderBFile, 'page:\n  id: third\n  components: []');

      const loadCalls = [];
      const cssMessages = [];
      const themeManager = {
        _themePath: undefined,
        getThemePath() {
          return this._themePath;
        },
        setThemePath(themePath) {
          this._themePath = themePath;
        },
        watchThemeFile() {},
        dispose() {},
        loadTheme: async function() {
          loadCalls.push(this._themePath);
        },
        generateCSSVariables: function() {
          return this._themePath
            ? `css:${path.basename(path.dirname(this._themePath))}`
            : 'css:default';
        }
      };
      webviewManager.themeManager = themeManager;
      if (webviewManager.messageHandler) {
        webviewManager.messageHandler.themeManager = themeManager;
      }

      themeManager.loadTheme = async function() {
        loadCalls.push(this._themePath);
      };
      themeManager.generateCSSVariables = function() {
        return this._themePath
          ? `css:${path.basename(path.dirname(this._themePath))}`
          : 'css:default';
      };

      try {
        await webviewManager.openPreview();
        const panel = webviewManager.getPanel();
        assert.ok(panel, 'WebView panel should open for theme sync test');

        panel.webview.postMessage = (message) => {
          if (message.type === 'theme-variables') {
            cssMessages.push(message.css);
          }
          return Promise.resolve(true);
        };

        webviewManager.setLastTuiFile(folderAFile);
        await waitForSync();

        assert.deepStrictEqual(loadCalls, [folderATheme], 'initial DSL selection should load the folder theme');
        assert.strictEqual(cssMessages.at(-1), 'css:folder-a', 'folder theme CSS should be applied after initial selection');

        themeManager.setThemePath(manualTheme);
        webviewManager.setLastTuiFile(sameFolderFile);
        await waitForSync();

        assert.deepStrictEqual(loadCalls, [folderATheme], 'same-folder switch should not force a theme reload');
        assert.strictEqual(themeManager.getThemePath(), manualTheme, 'same-folder switch should preserve manual theme selection');

        webviewManager.setLastTuiFile(folderBFile);
        await waitForSync();

        assert.deepStrictEqual(loadCalls, [folderATheme, undefined], 'cross-folder switch without a theme should fall back to default');
        assert.strictEqual(themeManager.getThemePath(), undefined, 'theme path should reset when the new folder has no theme');
        assert.strictEqual(cssMessages.at(-1), 'css:default', 'default CSS should be applied when the next folder has no theme');
      } finally {
        if (fs.existsSync(workspaceRoot)) {
          fs.rmSync(workspaceRoot, { recursive: true, force: true });
        }
      }
    });
  });

  describe('memory pressure handling', () => {
    let originalProcessMemoryUsage;

    beforeEach(() => {
      originalProcessMemoryUsage = process.memoryUsage;
    });

    afterEach(() => {
      process.memoryUsage = originalProcessMemoryUsage;
    });

    it('clears the cache above 150MB', async () => {
      const updateMgr = getWebViewUpdateManagerForTest(webviewManager);
      const yamlTest = updateMgr.createYamlCacheTestAdapter();
      process.memoryUsage = () => ({
        heapUsed: 160 * 1024 * 1024,
        heapTotal: 200 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 200 * 1024 * 1024
      });

      yamlTest.setYamlCacheContent('test content');
      yamlTest.runMemoryPressureCheckForTest();

      assert.strictEqual(yamlTest.getYamlCacheContent(), '', 'YAML cache should be cleared above 150MB');
    });

    it('clears the cache between 100MB and 150MB', async () => {
      const updateMgr = getWebViewUpdateManagerForTest(webviewManager);
      const yamlTest = updateMgr.createYamlCacheTestAdapter();
      process.memoryUsage = () => ({
        heapUsed: 120 * 1024 * 1024,
        heapTotal: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 150 * 1024 * 1024
      });

      yamlTest.setYamlCacheContent('test content');
      yamlTest.runMemoryPressureCheckForTest();

      assert.strictEqual(yamlTest.getYamlCacheContent(), '', 'YAML cache should be cleared between 100MB and 150MB');
    });

    it('keeps the cache between 50MB and 100MB', async () => {
      const updateMgr = getWebViewUpdateManagerForTest(webviewManager);
      const yamlTest = updateMgr.createYamlCacheTestAdapter();
      process.memoryUsage = () => ({
        heapUsed: 70 * 1024 * 1024,
        heapTotal: 100 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        rss: 100 * 1024 * 1024
      });

      const testContent = 'test content';
      yamlTest.setYamlCacheContent(testContent);
      yamlTest.runMemoryPressureCheckForTest();

      assert.strictEqual(yamlTest.getYamlCacheContent(), testContent, 'YAML cache should remain below 100MB');
    });

    it('keeps the cache below 50MB', async () => {
      const updateMgr = getWebViewUpdateManagerForTest(webviewManager);
      const yamlTest = updateMgr.createYamlCacheTestAdapter();
      process.memoryUsage = () => ({
        heapUsed: 30 * 1024 * 1024,
        heapTotal: 50 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        rss: 50 * 1024 * 1024
      });

      const testContent = 'test content';
      yamlTest.setYamlCacheContent(testContent);
      yamlTest.runMemoryPressureCheckForTest();

      assert.strictEqual(yamlTest.getYamlCacheContent(), testContent, 'YAML cache should remain below 50MB');
    });
  });

  describe('preview settings message', () => {
    it('sends preview settings on webview-ready', async () => {
      const { ConfigManager } = require('../../out/utils/config-manager.js');
      const originalGetWebViewSettings = ConfigManager.getWebViewSettings;
      ConfigManager.getWebViewSettings = () => ({
        preview: {
          showUpdateIndicator: true
        },
        jumpToDsl: {
          showHoverIndicator: true
        }
      });

      await webviewManager.openPreview();
      const panel = webviewManager.getPanel();
      assert.ok(panel, 'WebView panel should be available');

      let previewSettingsMessage = null;
      panel.webview.postMessage = (message) => {
        if (message.type === 'preview-settings') {
          previewSettingsMessage = message;
        }
        return Promise.resolve(true);
      };

      const handler = panel._messageHandler;
      assert.strictEqual(typeof handler, 'function', 'message handler should be registered');
      try {
        await handler({ type: 'webview-ready' });

        assert.ok(previewSettingsMessage, 'preview-settings message should be sent');
        assert.deepStrictEqual(previewSettingsMessage.settings, {
          preview: {
            showUpdateIndicator: true
          },
          jumpToDsl: {
            showHoverIndicator: true
          }
        });
      } finally {
        ConfigManager.getWebViewSettings = originalGetWebViewSettings;
      }
    });

    it('sends preview-updating when requested through the manager facade', async () => {
      await webviewManager.openPreview();
      const panel = webviewManager.getPanel();
      assert.ok(panel, 'WebView panel should be available');

      let updatingMessage = null;
      panel.webview.postMessage = (message) => {
        if (message.type === 'preview-updating') {
          updatingMessage = message;
        }
        return Promise.resolve(true);
      };

      webviewManager.sendUpdatingSignal();

      assert.deepStrictEqual(updatingMessage, { type: 'preview-updating' });
    });
  });
});
