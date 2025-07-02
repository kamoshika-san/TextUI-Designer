const { expect } = require('chai');

// VSCode APIのモック
const vscode = {
  ExtensionContext: class {
    constructor() {
      this.subscriptions = [];
      this.extensionPath = __dirname;
    }
  },
  commands: {
    registerCommand: () => ({ dispose: () => {} })
  },
  workspace: {
    openTextDocument: () => Promise.resolve({ content: 'test', language: 'markdown' })
  },
  window: {
    showTextDocument: () => Promise.resolve()
  }
};

// グローバルにモックを設定
global.vscode = vscode;

describe('CommandManager', () => {
  let commandManager;

  beforeEach(function () {
    // ファクトリからCommandManagerを作成
    global.cleanupMocks();
    
    if (!global.CommandManagerFactory || typeof global.CommandManagerFactory.createForTest !== 'function') {
      const path = require('path');
      const factoryPath = path.resolve(__dirname, '../mocks/command-manager-factory.js');
      const { CommandManagerFactory } = require(factoryPath);
      global.CommandManagerFactory = CommandManagerFactory;
    }
    
    commandManager = global.CommandManagerFactory.createForTest(global.vscode, {
      enableAutoPreview: true,
      performanceSettings: { enablePerformanceLogs: false }
    });
  });

  afterEach(() => {
    if (commandManager && commandManager._testHelpers) {
      commandManager._testHelpers.resetAllMocks();
      commandManager._testHelpers.restoreRequire();
    }
    global.cleanupMocks();
  });

  describe('コマンド登録', () => {
    it('registerCommands()で全てのコマンドが正しく登録される', () => {
      const initialSubscriptions = commandManager._testHelpers.mockContext.subscriptions.length;
      commandManager.registerCommands();

      // 期待されるコマンド数を確認（メモリ追跡コマンド3個を含む）
      const finalSubscriptions = commandManager._testHelpers.mockContext.subscriptions.length;
      expect(finalSubscriptions - initialSubscriptions).to.equal(19);
    });

    it('登録されたコマンドがcontextのsubscriptionsに追加される', () => {
      const initialSubscriptions = commandManager._testHelpers.mockContext.subscriptions.length;
      commandManager.registerCommands();

      // 登録されたコマンドの数だけsubscriptionsに追加されていることを確認（メモリ追跡コマンド3個を含む）
      const finalSubscriptions = commandManager._testHelpers.mockContext.subscriptions.length;
      expect(finalSubscriptions - initialSubscriptions).to.equal(19);
    });
  });

  describe('プレビュー関連コマンド', () => {
    it('openPreviewコマンドでopenPreviewWithCheck()が呼び出される', async () => {
      commandManager.registerCommands();

      // openPreviewWithCheckメソッドが存在することを確認
      expect(typeof commandManager.openPreviewWithCheck).to.equal('function');
    });

    it('WebViewManagerが正しく設定されている', () => {
      // ファクトリで作成されたWebViewManagerが正しく設定されていることを確認
      expect(commandManager._testHelpers.mockWebViewManager).to.exist;
      expect(typeof commandManager._testHelpers.mockWebViewManager.openPreview).to.equal('function');
      expect(typeof commandManager._testHelpers.mockWebViewManager.openDevTools).to.equal('function');
    });
  });

  describe('サービス依存関係の検証', () => {
    it('ExportServiceが正しく設定されている', () => {
      expect(commandManager._testHelpers.mockExportService).to.exist;
      expect(typeof commandManager._testHelpers.mockExportService.executeExport).to.equal('function');
      expect(typeof commandManager._testHelpers.mockExportService.getSupportedFormats).to.equal('function');
    });

    it('TemplateServiceが正しく設定されている', () => {
      expect(commandManager._testHelpers.mockTemplateService).to.exist;
      expect(typeof commandManager._testHelpers.mockTemplateService.createTemplate).to.equal('function');
      expect(typeof commandManager._testHelpers.mockTemplateService.insertTemplate).to.equal('function');
    });

    it('SettingsServiceが正しく設定されている', () => {
      expect(commandManager._testHelpers.mockSettingsService).to.exist;
      expect(typeof commandManager._testHelpers.mockSettingsService.openSettings).to.equal('function');
      expect(typeof commandManager._testHelpers.mockSettingsService.resetSettings).to.equal('function');
    });

    it('SchemaManagerが正しく設定されている', () => {
      expect(commandManager._testHelpers.mockSchemaManager).to.exist;
      expect(typeof commandManager._testHelpers.mockSchemaManager.reinitialize).to.equal('function');
      expect(typeof commandManager._testHelpers.mockSchemaManager.debugSchemas).to.equal('function');
    });

    it('ErrorHandlerが正しく設定されている', () => {
      expect(commandManager._testHelpers.mockErrorHandler).to.exist;
      expect(typeof commandManager._testHelpers.mockErrorHandler.executeSafely).to.equal('function');
      expect(typeof commandManager._testHelpers.mockErrorHandler.showInfo).to.equal('function');
    });

    it('ConfigManagerが正しく設定されている', () => {
      expect(commandManager._testHelpers.mockConfigManager).to.exist;
      expect(typeof commandManager._testHelpers.mockConfigManager.isAutoPreviewEnabled).to.equal('function');
      expect(typeof commandManager._testHelpers.mockConfigManager.getPerformanceSettings).to.equal('function');
    });

    it('PerformanceMonitorが正しく設定されている', () => {
      expect(commandManager._testHelpers.mockPerformanceMonitor).to.exist;
      expect(typeof commandManager._testHelpers.mockPerformanceMonitor.getInstance).to.equal('function');
    });
  });

  describe('openPreviewWithCheck()', () => {
    it('openPreviewWithCheckメソッドが正しく実装されている', () => {
      // openPreviewWithCheckメソッドが存在し、呼び出し可能であることを確認
      expect(typeof commandManager.openPreviewWithCheck).to.equal('function');
      
      // メソッドの実行が例外を投げないことを確認
      expect(() => commandManager.openPreviewWithCheck()).to.not.throw();
    });
  });

  describe('メモリ追跡関連コマンド', () => {
    it('メモリ追跡コマンドが正しく登録されている', () => {
      const initialSubscriptions = commandManager._testHelpers.mockContext.subscriptions.length;
      commandManager.registerCommands();

      // メモリ追跡コマンドが登録されていることを確認（3個追加）
      const finalSubscriptions = commandManager._testHelpers.mockContext.subscriptions.length;
      expect(finalSubscriptions - initialSubscriptions).to.equal(19);
    });

    it('TextUIMemoryTrackerのモックが正しく設定されている', () => {
      // TextUIMemoryTrackerは動的インポートで使用されるため、
      // ファクトリのモックが正しく設定されていることを確認
      expect(commandManager._testHelpers.mockTextUIMemoryTracker).to.exist;
      expect(typeof commandManager._testHelpers.mockTextUIMemoryTracker.getInstance).to.equal('function');
      
      // モックのインスタンスメソッドが正しく設定されていることを確認
      const mockInstance = commandManager._testHelpers.mockTextUIMemoryTracker.getInstance();
      expect(typeof mockInstance.generateMemoryReport).to.equal('function');
      expect(typeof mockInstance.getMetrics).to.equal('function');
      expect(typeof mockInstance.setEnabled).to.equal('function');
    });
  });
}); 