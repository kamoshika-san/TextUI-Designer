/**
 * テーマ切り替え機能の結合テスト
 *
 * WebViewMessageHandlerを通したテーマ検出・切り替えを検証します
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

describe('テーマ切り替え機能 結合テスト', () => {
  let webviewManager;
  let testWorkspaceDir;
  let testThemeFiles = [];
  let folderAActiveTuiPath;
  let folderBActiveTuiPath;
  const emittedMessages = [];
  const mockThemeManager = {
    themePath: '',
    getThemePath() { return this.themePath; },
    setThemePath(themePath) { this.themePath = themePath; },
    loadTheme: async () => {},
    generateCSSVariables: () => '--mock-theme-var: 1;',
    /** @param {(css: string) => void} _callback WebViewMessageHandler.handleWebViewReady から登録（T-305）。結合テストではファイル監視を再現しない。 */
    watchThemeFile(_callback) {}
  };

  const wait = (ms = 20) => new Promise(resolve => setTimeout(resolve, ms));

  const setupMessageCapture = () => {
    const panel = webviewManager.getPanel();
    assert.ok(panel, 'WebViewパネルが作成されている');

    const originalPostMessage = panel.webview.postMessage;
    panel.webview.postMessage = (message) => {
      emittedMessages.push(message);
      if (typeof originalPostMessage === 'function') {
        return originalPostMessage(message);
      }
      return Promise.resolve(true);
    };

    const messageHandler = panel._messageHandler;
    assert.strictEqual(typeof messageHandler, 'function', 'メッセージハンドラーが登録されている');

    return { panel, messageHandler };
  };

  beforeEach(async () => {
    global.cleanupMocks();

    if (!global.WebViewManagerFactory || typeof global.WebViewManagerFactory.createForTest !== 'function') {
      const factoryPath = path.resolve(__dirname, '../mocks/webview-manager-factory.js');
      const { WebViewManagerFactory } = require(factoryPath);
      global.WebViewManagerFactory = WebViewManagerFactory;
    }

    testWorkspaceDir = path.join(__dirname, '../fixtures/theme-integration-test');
    const sampleDir = path.join(testWorkspaceDir, 'sample');
    const folderADir = path.join(testWorkspaceDir, 'folder-a');
    const folderBDir = path.join(testWorkspaceDir, 'folder-b');
    const nestedThemeDir = path.join(sampleDir, 'nested', 'themes');
    const otherDir = path.join(testWorkspaceDir, 'other');
    fs.mkdirSync(sampleDir, { recursive: true });
    fs.mkdirSync(folderADir, { recursive: true });
    fs.mkdirSync(folderBDir, { recursive: true });
    fs.mkdirSync(nestedThemeDir, { recursive: true });
    fs.mkdirSync(otherDir, { recursive: true });

    const theme1Path = path.join(sampleDir, 'integration-one-theme.yml');
    const theme2Path = path.join(sampleDir, 'integration-two-theme.yml');
    const folderAThemePath = path.join(folderADir, 'textui-theme.yml');
    const folderBThemePath = path.join(folderBDir, 'textui-theme.yml');
    const nestedThemePath = path.join(nestedThemeDir, 'integration-nested-theme.yml');
    const outsideThemePath = path.join(otherDir, 'outside-theme.yml');
    const activeTuiPath = path.join(sampleDir, 'active.tui.yml');
    folderAActiveTuiPath = path.join(folderADir, 'active-a.tui.yml');
    folderBActiveTuiPath = path.join(folderBDir, 'active-b.tui.yml');

    fs.writeFileSync(theme1Path, `theme:
  name: "Integration Theme One"
  description: "First theme for integration testing"
  tokens:
    color:
      primary: "#007ACC"`);
    fs.writeFileSync(theme2Path, `theme:
  name: "Integration Theme Two"
  description: "Second theme for integration testing"
  tokens:
    color:
      primary: "#FF6B6B"`);

    fs.writeFileSync(folderAThemePath, `theme:
  name: "Folder A Theme"
  description: "Theme resolved from folder A"
  tokens:
    color:
      primary: "#16A34A"`);

    fs.writeFileSync(folderBThemePath, `theme:
  name: "Folder B Theme"
  description: "Theme resolved from folder B"
  tokens:
    color:
      primary: "#DC2626"`);

    fs.writeFileSync(nestedThemePath, `theme:
  name: "Integration Nested Theme"
  description: "Nested directory theme"
  tokens:
    color:
      primary: "#7C3AED"`);

    fs.writeFileSync(outsideThemePath, `theme:
  name: "Outside Theme"
  description: "Theme outside active tui directory"
  tokens:
    color:
      primary: "#0EA5E9"`);

    fs.writeFileSync(activeTuiPath, `page:
  id: active
  components: []`);
    fs.writeFileSync(folderAActiveTuiPath, `page:
  id: active-a
  components: []`);
    fs.writeFileSync(folderBActiveTuiPath, `page:
  id: active-b
  components: []`);

    testThemeFiles = [
      theme1Path,
      theme2Path,
      folderAThemePath,
      folderBThemePath,
      nestedThemePath,
      outsideThemePath,
      activeTuiPath,
      folderAActiveTuiPath,
      folderBActiveTuiPath
    ];
    emittedMessages.length = 0;

    webviewManager = global.WebViewManagerFactory.createForTest(global.vscode, {
      enablePerformance: true,
      cacheTTL: 300000,
      maxCacheSize: 100
    });

    webviewManager._testHelpers.extendedVscode.workspace.workspaceFolders = [{
      uri: { fsPath: testWorkspaceDir },
      name: 'theme-integration-test',
      index: 0
    }];
    webviewManager._testHelpers.extendedVscode.window.activeTextEditor = {
      document: {
        fileName: activeTuiPath,
        getText: () => 'page:\n  components: []'
      }
    };

    // 本番と同じくMessageHandler側にもThemeManagerを設定
    webviewManager.themeManager = mockThemeManager;
    if (webviewManager.messageHandler) {
      webviewManager.messageHandler.themeManager = mockThemeManager;
    }

    await webviewManager.openPreview();
  });

  afterEach(() => {
    for (const filePath of testThemeFiles) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    testThemeFiles = [];

    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }

    if (webviewManager && typeof webviewManager.dispose === 'function') {
      webviewManager.dispose();
    }

    if (webviewManager && webviewManager._testHelpers) {
      webviewManager._testHelpers.resetAllMocks();
      webviewManager._testHelpers.restoreRequire();
    }

    global.cleanupMocks();
  });

  it('webview-readyでテーマ一覧を送信し、作成したテーマを検出する', async () => {
    const { messageHandler } = setupMessageCapture();

    await messageHandler({ type: 'webview-ready' });
    await wait(50);

    const themeMessage = emittedMessages.find(msg => msg.type === 'available-themes');
    assert.ok(themeMessage, 'available-themesメッセージが送信される');
    assert.ok(Array.isArray(themeMessage.themes), 'themesが配列で返る');

    const names = themeMessage.themes.map(theme => theme.name);
    assert.ok(names.includes('Default'), 'Default theme is included');
    assert.ok(names.includes('Integration Theme One'), '追加テーマ1が検出される');
    assert.ok(names.includes('Integration Theme Two'), '追加テーマ2が検出される');
    assert.ok(names.includes('Integration Nested Theme'), 'ネストディレクトリのテーマが検出される');
    assert.ok(!names.includes('Outside Theme'), 'アクティブtui.yml配下以外のテーマは検出されない');
  });

  it('theme-switchでCSS適用とアクティブテーマ更新が行われる', async () => {
    const { messageHandler } = setupMessageCapture();

    await messageHandler({ type: 'theme-switch', themePath: 'sample/integration-one-theme.yml' });
    await wait(50);

    const cssMessage = emittedMessages.find(msg => msg.type === 'theme-variables');
    assert.ok(cssMessage, 'theme-variablesメッセージが送信される');
    assert.strictEqual(cssMessage.css, '--mock-theme-var: 1;', 'テーマCSSが適用される');

    const themeMessage = [...emittedMessages].reverse().find(msg => msg.type === 'available-themes');
    assert.ok(themeMessage, 'テーマ切り替え後にavailable-themesが再送される');

    // ThemeDiscoveryService は path.relative を使うため、Windows では '\' 区切りになり得る
    const expectedRel = path.join('sample', 'integration-one-theme.yml');
    const activeTheme = themeMessage.themes.find(
      theme => path.normalize(theme.path) === path.normalize(expectedRel)
    );
    assert.ok(activeTheme, '切り替え先テーマが一覧に存在する');
    assert.strictEqual(activeTheme.isActive, true, '切り替え先テーマがアクティブになる');
  });

  it('無効メッセージを受けても例外を投げず処理継続する', async () => {
    const { messageHandler } = setupMessageCapture();
    const invalidMessages = [null, undefined, { type: undefined }, { type: 'unknown-message' }];

    for (const message of invalidMessages) {
      await messageHandler(message);
    }

    // クラッシュせず、後続の正常メッセージを処理できることを確認
    await messageHandler({ type: 'get-themes' });
    await wait(20);
    const themeMessage = emittedMessages.find(msg => msg.type === 'available-themes');
    assert.ok(themeMessage, '無効メッセージ後も正常処理が継続できる');
  });
  it('cross-folder DSL switch updates the active theme entry to the new folder theme', async () => {
    setupMessageCapture();

    webviewManager._testHelpers.extendedVscode.window.activeTextEditor.document.fileName = folderAActiveTuiPath;
    webviewManager.setLastTuiFile(folderAActiveTuiPath);
    await wait(50);
    emittedMessages.length = 0;

    webviewManager._testHelpers.extendedVscode.window.activeTextEditor.document.fileName = folderBActiveTuiPath;
    webviewManager.setLastTuiFile(folderBActiveTuiPath);
    await wait(50);

    const themeMessage = [...emittedMessages].reverse().find(msg => msg.type === 'available-themes');
    assert.ok(themeMessage, 'available-themes should be emitted after the folder switch');

    assert.strictEqual(
      path.normalize(mockThemeManager.getThemePath()),
      path.normalize(path.join(testWorkspaceDir, 'folder-b', 'textui-theme.yml')),
      'theme manager should resolve the new folder theme before refreshing the list'
    );

    const activeThemes = themeMessage.themes.filter(theme => theme.isActive);
    assert.strictEqual(activeThemes.length, 1, 'exactly one theme entry should be active after the folder switch');
    assert.strictEqual(
      path.normalize(activeThemes[0].path),
      path.normalize(path.join('folder-b', 'textui-theme.yml')),
      'the active theme entry should follow the newly active DSL folder'
    );
  });
});
