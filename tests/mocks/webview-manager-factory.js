/**
 * WebViewManager用のファクトリ
 * VSCode WebView API依存とファイルシステム操作のモックを含む
 */

class WebViewManagerFactory {
  static createForTest(vscode, options = {}) {
    // デフォルト設定
    const defaultOptions = {
      enablePerformance: true,
      cacheTTL: 300000,
      maxCacheSize: 100,
      monitoringEnabled: true,
      forceEnabled: false,
      ...options
    };

    // WebView パネルのモック
    const mockWebviewPanel = {
      webview: {
        html: '',
        postMessage: () => Promise.resolve(),
        onDidReceiveMessage: () => ({ dispose: () => {} }),
        asWebviewUri: (uri) => uri,
        cspSource: 'vscode-webview:'
      },
      onDidDispose: () => ({ dispose: () => {} }),
      reveal: () => {},
      dispose: () => {},
      title: 'TextUI Preview',
      viewType: 'textui-preview',
      visible: true,
      active: true
    };

    // 拡張VSCode APIモック
    const extendedVscode = {
      ...vscode,
      window: {
        ...vscode.window,
        activeTextEditor: null,
        createWebviewPanel: () => mockWebviewPanel,
        showTextDocument: () => Promise.resolve(),
        showInformationMessage: () => Promise.resolve(),
        showErrorMessage: () => Promise.resolve()
      },
      workspace: {
        ...vscode.workspace,
        getConfiguration: () => ({
          get: (key, defaultValue) => {
            const settings = {
              'textui.performance.enabled': defaultOptions.enablePerformance,
              'textui.performance.cacheTTL': defaultOptions.cacheTTL,
              'textui.performance.maxCacheSize': defaultOptions.maxCacheSize,
              'textui.performance.monitoringEnabled': defaultOptions.monitoringEnabled,
              'textui.performance.forceEnabled': defaultOptions.forceEnabled
            };
            return settings[key] !== undefined ? settings[key] : defaultValue;
          }
        }),
        openTextDocument: () => Promise.resolve({
          getText: () => 'test content',
          fileName: 'test.tui.yml',
          languageId: 'yaml'
        }),
        workspaceFolders: [{
          uri: {
            fsPath: '/test/workspace'
          },
          name: 'test-workspace',
          index: 0
        }]
      },
      ViewColumn: {
        One: 1,
        Two: 2,
        Three: 3,
        Active: -1,
        Beside: -2
      },
      Uri: {
        file: (path) => ({ 
          fsPath: path,
          scheme: 'file',
          path: path
        }),
        joinPath: (base, ...paths) => ({
          fsPath: require('path').join(base.fsPath, ...paths),
          scheme: base.scheme
        })
      }
    };

    // Mock contextを作成
    const mockContext = {
      extensionUri: { fsPath: __dirname + '/../../' },
      subscriptions: [],
      extensionPath: __dirname + '/../../',
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve()
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve()
      }
    };

    // Module requireフックを設定
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    Module.prototype.require = function(id) {
      if (id === 'vscode') {
        return extendedVscode;
      }
      return originalRequire.apply(this, arguments);
    };

    // WebViewManagerを作成
    const { WebViewManager } = require('../../out/services/webview-manager.js');
    const webviewManager = new WebViewManager(mockContext);

    // テスト用のヘルパーメソッドを追加
    webviewManager._testHelpers = {
      mockWebviewPanel,
      mockContext,
      extendedVscode,
      resetAllMocks: () => {
        // ファクトリパターンでは基本的にリセット不要
        // 必要に応じて状態のリセット処理を追加
        mockWebviewPanel.webview.html = '';
        mockWebviewPanel.visible = true;
        mockWebviewPanel.active = true;
      },
      restoreRequire: () => {
        Module.prototype.require = originalRequire;
      },
      // テスト用ファイル作成ヘルパー
      createTestFile: (content = 'test content') => {
        const fs = require('fs');
        const path = require('path');
        const testFilePath = path.join(__dirname, 'webview-test.tui.yml');
        fs.writeFileSync(testFilePath, content, 'utf-8');
        return testFilePath;
      },
      // テスト用ファイル削除ヘルパー
      cleanupTestFile: (filePath) => {
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    };

    return webviewManager;
  }
}

module.exports = { WebViewManagerFactory }; 