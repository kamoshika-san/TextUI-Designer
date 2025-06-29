/**
 * ExportService用のファクトリ
 * ファイル操作とエクスポートマネージャーのモックを含む
 */

class ExportServiceFactory {
  static createForTest(vscode, options = {}) {
    // デフォルト設定
    const defaultOptions = {
      enablePerformance: true,
      cacheTTL: 300000,
      maxCacheSize: 100,
      monitoringEnabled: true,
      ...options
    };

    // Mock ExportManagerを作成
    const mockExportManager = {
      getSupportedFormats: () => ['html', 'react', 'pug'],
      getFileExtension: (format) => {
        const extensions = { html: '.html', react: '.jsx', pug: '.pug' };
        return extensions[format] || '.txt';
      },
      exportFromFile: async (filePath, options) => {
        // モックの実装
        return `<!-- Exported from ${filePath} -->\n<div>Mock export for ${options.format}</div>`;
      },
      dispose: () => {}
    };

    // 拡張VSCode APIモック
    const extendedVscode = {
      ...vscode,
      window: {
        ...vscode.window,
        showQuickPick: () => Promise.resolve('html'),
        showSaveDialog: () => Promise.resolve({ fsPath: '/test/output.html' }),
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
              'textui.performance.monitoringEnabled': defaultOptions.monitoringEnabled
            };
            return settings[key] !== undefined ? settings[key] : defaultValue;
          }
        }),
        fs: {
          writeFile: () => Promise.resolve()
        }
      },
      Uri: {
        file: (path) => ({ 
          fsPath: path,
          scheme: 'file',
          path: path
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

    // ExportServiceを作成
    const { ExportService } = require('../../out/services/export-service.js');
    const exportService = new ExportService(mockExportManager);

    // テスト用のヘルパーメソッドを追加
    exportService._testHelpers = {
      mockExportManager,
      extendedVscode,
      resetAllMocks: () => {
        // ファクトリパターンでは基本的にリセット不要
        // 必要に応じて状態のリセット処理を追加
      },
      restoreRequire: () => {
        Module.prototype.require = originalRequire;
      },
      // テスト用ファイル作成ヘルパー
      createTestFile: (content = 'test content') => {
        const fs = require('fs');
        const path = require('path');
        const testFilePath = path.join(__dirname, 'export-test.tui.yml');
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

    return exportService;
  }
}

module.exports = { ExportServiceFactory }; 