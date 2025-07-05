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

    // VS Code APIのモックを拡張
    const mockVscode = {
      ...vscode,
      languages: {
        registerDefinitionProvider: sinon.stub().returns({ dispose: () => {} }),
        registerCompletionItemProvider: sinon.stub().returns({ dispose: () => {} }),
        registerHoverProvider: sinon.stub().returns({ dispose: () => {} })
      }
    };

    // DefinitionProviderのモック
    const mockDefinitionProvider = {
      provideDefinition: sinon.stub().returns([]),
      dispose: sinon.stub()
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
      getPerformanceSettings: sinon.stub().returns({
        ...defaultOptions.performanceSettings,
        enableMemoryTracking: false,
        memoryMeasurementInterval: 5000,
        memoryCleanupInterval: 30000
      }),
      set: sinon.stub().resolves(),
      get: sinon.stub().callsFake((key, defaultValue) => {
        const settings = {
          'textui.autoPreview': defaultOptions.enableAutoPreview,
          'textui.performance.enabled': defaultOptions.performanceSettings.enablePerformanceLogs,
          'textui.performance.enableMemoryTracking': false
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

    // TextUIMemoryTrackerのモック
    const mockTextUIMemoryTracker = {
      getInstance: sinon.stub().returns({
        generateMemoryReport: sinon.stub().returns('# Memory Report\nMock memory report'),
        getMetrics: sinon.stub().returns({
          webviewMemory: 0,
          yamlCacheMemory: 0,
          diagnosticsMemory: 0,
          renderCacheMemory: 0,
          totalTrackedMemory: 0,
          lastMeasured: Date.now()
        }),
        setEnabled: sinon.stub(),
        dispose: sinon.stub()
      })
    };

    // setup.jsで設定されたglobal.vscodeを使用（Module requireフックは削除）
    
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
      mockSchemaManager,
      mockDefinitionProvider
    );

    // テスト用のヘルパーメソッドを追加
    commandManager._testHelpers = {
      mockWebViewManager,
      mockExportService,
      mockTemplateService,
      mockSettingsService,
      mockSchemaManager,
      mockDefinitionProvider,
      mockErrorHandler,
      mockConfigManager,
      mockPerformanceMonitor,
      mockTextUIMemoryTracker,
      mockContext,
      mockVscode,
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
        Object.values(mockDefinitionProvider).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
        Object.values(mockErrorHandler).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
        Object.values(mockConfigManager).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
        Object.values(mockPerformanceMonitor).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
        Object.values(mockTextUIMemoryTracker).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
        // languages APIのリセット
        Object.values(mockVscode.languages).forEach(stub => {
          if (typeof stub.resetHistory === 'function') stub.resetHistory();
        });
      },
      restoreRequire: () => {
        // Module.prototype.require = originalRequire; // This line is removed
      }
    };

    return commandManager;
  }
}

module.exports = { CommandManagerFactory }; 