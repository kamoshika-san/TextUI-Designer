/**
 * CommandManager用のファクトリ
 * 複雑な依存関係を持つCommandManagerのテスト用インスタンスを作成
 */

const sinon = require('sinon');

class CommandManagerFactory {
  static createForTest(vscode, options = {}) {
    // デフォルト設定
    const defaultOptions = {
      enableAutoPreview: true,
      performanceSettings: { enablePerformanceLogs: false },
      ...options
    };

    // WebViewManagerのモック
    const mockWebViewManager = {
      openPreview: sinon.stub().resolves(),
      openDevTools: sinon.stub().resolves(),
      hasPanel: sinon.stub().returns(false),
      dispose: sinon.stub()
    };

    // ExportServiceのモック
    const mockExportService = {
      executeExport: sinon.stub().resolves(),
      getSupportedFormats: sinon.stub().returns(['html', 'react', 'pug']),
      dispose: sinon.stub()
    };

    // TemplateServiceのモック
    const mockTemplateService = {
      createTemplate: sinon.stub().resolves(),
      insertTemplate: sinon.stub().resolves(),
      getAvailableTemplates: sinon.stub().returns(['form', 'card', 'modal']),
      dispose: sinon.stub()
    };

    // SettingsServiceのモック
    const mockSettingsService = {
      openSettings: sinon.stub().resolves(),
      resetSettings: sinon.stub().resolves(),
      showAutoPreviewSetting: sinon.stub().resolves(),
      getSettings: sinon.stub().returns(defaultOptions),
      dispose: sinon.stub()
    };

    // SchemaManagerのモック
    const mockSchemaManager = {
      reinitialize: sinon.stub().resolves(),
      debugSchemas: sinon.stub().resolves(),
      validateSchema: sinon.stub().returns({ valid: true, errors: [] }),
      dispose: sinon.stub()
    };

    // ErrorHandlerのモック
    const mockErrorHandler = {
      executeSafely: sinon.stub().callsFake(async (fn) => {
        try {
          await fn();
          return true;
        } catch (error) {
          console.error('Mock ErrorHandler caught:', error);
          return false;
        }
      }),
      showInfo: sinon.stub(),
      showError: sinon.stub(),
      logError: sinon.stub()
    };

    // ConfigManagerのモック
    const mockConfigManager = {
      isAutoPreviewEnabled: sinon.stub().returns(defaultOptions.enableAutoPreview),
      getPerformanceSettings: sinon.stub().returns(defaultOptions.performanceSettings),
      set: sinon.stub().resolves(),
      get: sinon.stub().callsFake((key, defaultValue) => {
        const settings = {
          'textui.autoPreview': defaultOptions.enableAutoPreview,
          'textui.performance.enabled': defaultOptions.performanceSettings.enablePerformanceLogs
        };
        return settings[key] !== undefined ? settings[key] : defaultValue;
      })
    };

    // PerformanceMonitorのモック
    const mockPerformanceMonitor = {
      getInstance: sinon.stub().returns({
        generateReport: sinon.stub().returns('# Performance Report\nMock test report'),
        clear: sinon.stub(),
        setEnabled: sinon.stub(),
        generateSampleEvents: sinon.stub(),
        getMetrics: sinon.stub().returns({
          totalOperations: 0,
          averageResponseTime: 0,
          cacheHitRate: 0
        }),
        dispose: sinon.stub()
      })
    };

    // Module requireフックを設定
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    
    Module.prototype.require = function(id) {
      if (id === 'vscode') {
        return vscode;
      }
      if (id.includes('error-handler')) {
        return { ErrorHandler: mockErrorHandler };
      }
      if (id.includes('config-manager')) {
        return { ConfigManager: mockConfigManager };
      }
      if (id.includes('performance-monitor')) {
        return { PerformanceMonitor: mockPerformanceMonitor };
      }
      return originalRequire.apply(this, arguments);
    };

    // CommandManagerを作成
    const { CommandManager } = require('../../out/services/command-manager.js');
    
    // Mock contextを作成
    const mockContext = {
      subscriptions: [],
      extensionPath: __dirname + '/../../',
      extensionUri: { fsPath: __dirname + '/../../' }
    };

    const commandManager = new CommandManager(
      mockContext,
      mockWebViewManager,
      mockExportService,
      mockTemplateService,
      mockSettingsService,
      mockSchemaManager
    );

    // テスト用のヘルパーメソッドを追加
    commandManager._testHelpers = {
      mockWebViewManager,
      mockExportService,
      mockTemplateService,
      mockSettingsService,
      mockSchemaManager,
      mockErrorHandler,
      mockConfigManager,
      mockPerformanceMonitor,
      mockContext,
      resetAllMocks: () => {
        sinon.resetHistory();
        // 各モックのリセット
        Object.values(mockWebViewManager).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
        Object.values(mockExportService).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
        Object.values(mockTemplateService).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
        Object.values(mockSettingsService).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
        Object.values(mockSchemaManager).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
        Object.values(mockErrorHandler).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
        Object.values(mockConfigManager).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
      },
      restoreRequire: () => {
        Module.prototype.require = originalRequire;
      }
    };

    return commandManager;
  }
}

module.exports = { CommandManagerFactory }; 