/**
 * WebViewManager用のファクトリ
 * VSCode WebView API依存とファイルシステム操作のモックを含む
 */

const Module = require('module');

class WebViewManagerFactory {
  static createForTest(vscode, options = {}) {
    void vscode;
    /** setup と同一の完全モック（ViewColumn 等）。require フックの外側でも一貫させる */
    const vscodeApi = require('./vscode-mock.js');

    // デフォルト設定
    const defaultOptions = {
      enablePerformance: true,
      cacheTTL: 300000,
      maxCacheSize: 100,
      monitoringEnabled: true,
      forceEnabled: false,
      ...options
    };

    // WebView パネルのモック（堅牢化）
    const mockWebviewPanel = {
      webview: {
        html: '',
        postMessage: (message) => {
          console.log('[モック] WebView postMessage:', message?.type || 'unknown');
          return Promise.resolve();
        },
        onDidReceiveMessage: (callback) => {
          // メッセージハンドラーを格納してテストで使用できるようにする
          mockWebviewPanel._messageHandler = callback;
          return { dispose: () => {} };
        },
        asWebviewUri: (uri) => uri,
        cspSource: 'vscode-webview:'
      },
      onDidDispose: (callback) => {
        mockWebviewPanel._disposeHandler = callback;
        return { dispose: () => {} };
      },
      reveal: () => {
        console.log('[モック] WebView reveal called');
      },
      dispose: () => {
        console.log('[モック] WebView dispose called');
        // disposeハンドラーが設定されている場合は呼び出す
        if (mockWebviewPanel._disposeHandler) {
          try {
            mockWebviewPanel._disposeHandler();
          } catch (error) {
            console.warn('[モック] dispose handler error:', error.message);
          }
        }
      },
      title: 'TextUI Preview',
      viewType: 'textui-preview',
      visible: true,
      active: true,
      // メッセージハンドラーへの参照（テスト用）
      _messageHandler: null,
      _disposeHandler: null
    };

    const restorePatches = [];
    const patch = (obj, key, value) => {
      const previous = obj[key];
      obj[key] = value;
      restorePatches.push(() => {
        obj[key] = previous;
      });
    };

    patch(vscodeApi.window, 'activeTextEditor', null);
    patch(vscodeApi.window, 'createWebviewPanel', () => mockWebviewPanel);
    patch(vscodeApi.window, 'showTextDocument', () => Promise.resolve());
    patch(vscodeApi.window, 'showInformationMessage', () => Promise.resolve());
    patch(vscodeApi.window, 'showErrorMessage', () => Promise.resolve());

    patch(vscodeApi.workspace, 'getConfiguration', () => ({
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
    }));
    patch(vscodeApi.workspace, 'openTextDocument', () =>
      Promise.resolve({
        getText: () => 'test content',
        fileName: 'test.tui.yml',
        languageId: 'yaml'
      })
    );
    patch(vscodeApi.workspace, 'workspaceFolders', [
      {
        uri: {
          fsPath: '/test/workspace'
        },
        name: 'test-workspace',
        index: 0
      }
    ]);

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

    // WebView関連モジュールを毎回モック済み環境で読み込み直す
    const modulesToReload = [
      '../../out/services/webview-manager.js',
      '../../out/services/webview/webview-lifecycle-manager.js',
      '../../out/services/webview/webview-message-handler.js',
      '../../out/services/webview/webview-update-manager.js',
      '../../out/services/webview/theme-discovery-service.js',
      '../../out/services/webview/yaml-pointer-resolver.js'
    ];
    const parentRequire = Module.prototype.require;
    Module.prototype.require = function (id) {
      if (id === 'vscode') {
        return vscodeApi;
      }
      return parentRequire.apply(this, arguments);
    };

    let webviewManager;
    try {
      for (const modulePath of modulesToReload) {
        const resolvedPath = require.resolve(modulePath);
        delete require.cache[resolvedPath];
      }

      const { WebViewManager } = require('../../out/services/webview-manager.js');
      webviewManager = new WebViewManager(mockContext);
    } catch (err) {
      Module.prototype.require = parentRequire;
      throw err;
    }

    // テスト用のヘルパーメソッドを追加
    webviewManager._testHelpers = {
      mockWebviewPanel,
      mockContext,
      extendedVscode: vscodeApi,
      resetAllMocks: () => {
        // ファクトリパターンでは基本的にリセット不要
        // 必要に応じて状態のリセット処理を追加
        mockWebviewPanel.webview.html = '';
        mockWebviewPanel.visible = true;
        mockWebviewPanel.active = true;
      },
      restoreRequire: () => {
        for (let i = restorePatches.length - 1; i >= 0; i--) {
          restorePatches[i]();
        }
        restorePatches.length = 0;
        Module.prototype.require = parentRequire;
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