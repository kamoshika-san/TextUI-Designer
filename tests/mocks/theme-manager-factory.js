/**
 * ThemeManager用のファクトリ
 * ファイルシステムとワークスペース依存のモックを含む
 */

class ThemeManagerFactory {
  static createForTest(vscode, options = {}) {
    // デフォルト設定
    const defaultOptions = {
      extensionPath: __dirname + '/../../',
      workspacePath: __dirname + '/../../',
      ...options
    };

    // Mock contextを作成
    const mockContext = {
      extensionPath: defaultOptions.extensionPath,
      subscriptions: [],
      extensionUri: { fsPath: defaultOptions.extensionPath },
      globalState: {
        get: () => undefined,
        update: () => Promise.resolve()
      },
      workspaceState: {
        get: () => undefined,
        update: () => Promise.resolve()
      }
    };

    // 拡張VSCode APIモック
    const extendedVscode = {
      ...vscode,
      ExtensionContext: class {
        constructor() {
          this.subscriptions = [];
          this.extensionPath = defaultOptions.extensionPath;
        }
      },
      workspace: {
        ...vscode.workspace,
        workspaceFolders: [{
          uri: {
            fsPath: defaultOptions.workspacePath
          },
          name: 'test-workspace',
          index: 0
        }],
        getConfiguration: () => ({
          get: (key, defaultValue) => {
            const settings = {
              'textui.theme.enabled': true,
              'textui.theme.customPath': null
            };
            return settings[key] !== undefined ? settings[key] : defaultValue;
          }
        })
      },
      FileSystemWatcher: class {
        constructor() {
          this.onDidChange = () => {};
          this.onDidCreate = () => {};
          this.onDidDelete = () => {};
        }
        dispose() {}
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

    // Module requireフックを設定
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    Module.prototype.require = function(id) {
      if (id === 'vscode') {
        return extendedVscode;
      }
      return originalRequire.apply(this, arguments);
    };

    // ThemeManagerを作成
    const { ThemeManager } = require('../../out/services/theme-manager.js');
    const themeManager = new ThemeManager(mockContext);

    // テスト用のヘルパーメソッドを追加
    themeManager._testHelpers = {
      mockContext,
      extendedVscode,
      resetAllMocks: () => {
        // ファクトリパターンでは基本的にリセット不要
        // 必要に応じて状態のリセット処理を追加
      },
      restoreRequire: () => {
        Module.prototype.require = originalRequire;
      },
      // テスト用テーマファイル作成ヘルパー
      createTestThemeFile: (themeContent) => {
        const fs = require('fs');
        const path = require('path');
        const testThemePath = path.join(__dirname, '../../textui-theme.yml');
        fs.writeFileSync(testThemePath, JSON.stringify(themeContent, null, 2));
        return testThemePath;
      },
      // テスト用ファイル削除ヘルパー
      cleanupTestFile: (filePath) => {
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    };

    return themeManager;
  }
}

module.exports = { ThemeManagerFactory }; 