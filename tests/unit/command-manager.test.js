const sinon = require('sinon');
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
    registerCommand: sinon.stub().returns({ dispose: sinon.stub() })
  },
  workspace: {
    openTextDocument: sinon.stub().resolves({ content: 'test', language: 'markdown' })
  },
  window: {
    showTextDocument: sinon.stub().resolves()
  }
};

// vscodeモジュールをグローバルにモック
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(id) {
  if (id === 'vscode') {
    return vscode;
  }
  return originalRequire.apply(this, arguments);
};

// テスト用の依存サービスのモック
const mockWebViewManager = {
  openPreview: sinon.stub().resolves(),
  openDevTools: sinon.stub().resolves()
};

const mockExportService = {
  executeExport: sinon.stub().resolves()
};

const mockTemplateService = {
  createTemplate: sinon.stub().resolves(),
  insertTemplate: sinon.stub().resolves()
};

const mockSettingsService = {
  openSettings: sinon.stub().resolves(),
  resetSettings: sinon.stub().resolves(),
  showAutoPreviewSetting: sinon.stub().resolves()
};

const mockSchemaManager = {
  reinitialize: sinon.stub().resolves(),
  debugSchemas: sinon.stub().resolves()
};

// ErrorHandlerのモック
const mockErrorHandler = {
  executeSafely: sinon.stub().callsFake(async (fn) => {
    try {
      await fn();
      return true;
    } catch (error) {
      return false;
    }
  }),
  showInfo: sinon.stub()
};

// ConfigManagerのモック
const mockConfigManager = {
  isAutoPreviewEnabled: sinon.stub().returns(true),
  getPerformanceSettings: sinon.stub().returns({ enablePerformanceLogs: false }),
  set: sinon.stub().resolves()
};

// PerformanceMonitorのモック
const mockPerformanceMonitor = {
  getInstance: sinon.stub().returns({
    generateReport: sinon.stub().returns('# Performance Report\nTest report'),
    clear: sinon.stub(),
    setEnabled: sinon.stub(),
    generateSampleEvents: sinon.stub()
  })
};

// モジュールのモック設定
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

// テスト用のCommandManager（本番実装をrequireしてもOK）
const { CommandManager } = require('../../out/services/command-manager.js');

describe('CommandManager', () => {
  let commandManager;
  let mockContext;

  beforeEach(function () {
    mockContext = new vscode.ExtensionContext();

    // 各種モックのリセット
    sinon.resetHistory();
    vscode.commands.registerCommand.resetHistory();
    mockWebViewManager.openPreview.resetHistory();
    mockWebViewManager.openDevTools.resetHistory();
    mockExportService.executeExport.resetHistory();
    mockTemplateService.createTemplate.resetHistory();
    mockTemplateService.insertTemplate.resetHistory();
    mockSettingsService.openSettings.resetHistory();
    mockSettingsService.resetSettings.resetHistory();
    mockSettingsService.showAutoPreviewSetting.resetHistory();
    mockSchemaManager.reinitialize.resetHistory();
    mockSchemaManager.debugSchemas.resetHistory();
    mockErrorHandler.executeSafely.resetHistory();
    mockErrorHandler.showInfo.resetHistory();
    mockConfigManager.isAutoPreviewEnabled.resetHistory();
    mockConfigManager.getPerformanceSettings.resetHistory();
    mockConfigManager.set.resetHistory();

    commandManager = new CommandManager(
      mockContext,
      mockWebViewManager,
      mockExportService,
      mockTemplateService,
      mockSettingsService,
      mockSchemaManager
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  after(() => {
    // モックを復元
    Module.prototype.require = originalRequire;
  });

  describe('コマンド登録', () => {
    it('registerCommands()で全てのコマンドが正しく登録される', () => {
      commandManager.registerCommands();

      // 期待されるコマンド数を確認（実際の登録数に合わせて修正）
      expect(vscode.commands.registerCommand.callCount).to.equal(16);

      // 主要なコマンドが登録されていることを確認
      const registeredCommands = vscode.commands.registerCommand.getCalls().map(call => call.args[0]);
      
      expect(registeredCommands).to.include('textui-designer.openPreview');
      expect(registeredCommands).to.include('textui-designer.openDevTools');
      expect(registeredCommands).to.include('textui-designer.export');
      expect(registeredCommands).to.include('textui-designer.createTemplate');
      expect(registeredCommands).to.include('textui-designer.insertTemplate');
      expect(registeredCommands).to.include('textui-designer.openSettings');
      expect(registeredCommands).to.include('textui-designer.resetSettings');
      expect(registeredCommands).to.include('textui-designer.showSettings');
      expect(registeredCommands).to.include('textui-designer.checkAutoPreviewSetting');
      expect(registeredCommands).to.include('textui-designer.reinitializeSchemas');
      expect(registeredCommands).to.include('textui-designer.debugSchemas');
      expect(registeredCommands).to.include('textui-designer.showPerformanceReport');
      expect(registeredCommands).to.include('textui-designer.clearPerformanceMetrics');
      expect(registeredCommands).to.include('textui-designer.togglePerformanceMonitoring');
      expect(registeredCommands).to.include('textui-designer.enablePerformanceMonitoring');
      expect(registeredCommands).to.include('textui-designer.generateSampleEvents');
    });

    it('登録されたコマンドがcontextのsubscriptionsに追加される', () => {
      commandManager.registerCommands();

      // 登録されたコマンドの数だけsubscriptionsに追加されていることを確認
      expect(mockContext.subscriptions.length).to.equal(16);
    });
  });

  describe('プレビュー関連コマンド', () => {
    it('openPreviewコマンドでopenPreviewWithCheck()が呼び出される', async () => {
      commandManager.registerCommands();

      // openPreviewコマンドのコールバックを取得して実行
      const openPreviewCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.openPreview').args[1];

      await openPreviewCallback();

      expect(mockWebViewManager.openPreview.calledOnce).to.be.true;
    });

    it('openDevToolsコマンドでwebViewManager.openDevTools()が呼び出される', async () => {
      commandManager.registerCommands();

      // openDevToolsコマンドのコールバックを取得して実行
      const openDevToolsCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.openDevTools').args[1];

      await openDevToolsCallback();

      expect(mockWebViewManager.openDevTools.calledOnce).to.be.true;
    });
  });

  describe('エクスポート関連コマンド', () => {
    it('exportコマンドでexportService.executeExport()が呼び出される', async () => {
      commandManager.registerCommands();

      // exportコマンドのコールバックを取得して実行
      const exportCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.export').args[1];

      const testFilePath = '/test/path.tui.yml';
      await exportCallback(testFilePath);

      expect(mockExportService.executeExport.calledOnce).to.be.true;
      expect(mockExportService.executeExport.calledWith(testFilePath)).to.be.true;
    });
  });

  describe('テンプレート関連コマンド', () => {
    it('createTemplateコマンドでtemplateService.createTemplate()が呼び出される', async () => {
      commandManager.registerCommands();

      const createTemplateCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.createTemplate').args[1];

      await createTemplateCallback();

      expect(mockTemplateService.createTemplate.calledOnce).to.be.true;
    });

    it('insertTemplateコマンドでtemplateService.insertTemplate()が呼び出される', async () => {
      commandManager.registerCommands();

      const insertTemplateCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.insertTemplate').args[1];

      await insertTemplateCallback();

      expect(mockTemplateService.insertTemplate.calledOnce).to.be.true;
    });
  });

  describe('設定関連コマンド', () => {
    it('openSettingsコマンドでsettingsService.openSettings()が呼び出される', async () => {
      commandManager.registerCommands();

      const openSettingsCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.openSettings').args[1];

      await openSettingsCallback();

      expect(mockSettingsService.openSettings.calledOnce).to.be.true;
    });

    it('resetSettingsコマンドでsettingsService.resetSettings()が呼び出される', async () => {
      commandManager.registerCommands();

      const resetSettingsCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.resetSettings').args[1];

      await resetSettingsCallback();

      expect(mockSettingsService.resetSettings.calledOnce).to.be.true;
    });

    it('showSettingsコマンドでsettingsService.showAutoPreviewSetting()が呼び出される', async () => {
      commandManager.registerCommands();

      const showSettingsCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.showSettings').args[1];

      await showSettingsCallback();

      expect(mockSettingsService.showAutoPreviewSetting.calledOnce).to.be.true;
    });

    it('checkAutoPreviewSettingコマンドで自動プレビュー設定がチェックされる', async () => {
      commandManager.registerCommands();

      const checkAutoPreviewCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.checkAutoPreviewSetting').args[1];

      await checkAutoPreviewCallback();

      expect(mockErrorHandler.executeSafely.calledOnce).to.be.true;
      expect(mockConfigManager.isAutoPreviewEnabled.calledOnce).to.be.true;
    });
  });

  describe('スキーマ関連コマンド', () => {
    it('reinitializeSchemasコマンドでschemaManager.reinitialize()が呼び出される', async () => {
      commandManager.registerCommands();

      const reinitializeSchemasCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.reinitializeSchemas').args[1];

      await reinitializeSchemasCallback();

      expect(mockSchemaManager.reinitialize.calledOnce).to.be.true;
    });

    it('debugSchemasコマンドでschemaManager.debugSchemas()が呼び出される', async () => {
      commandManager.registerCommands();

      const debugSchemasCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.debugSchemas').args[1];

      await debugSchemasCallback();

      expect(mockSchemaManager.debugSchemas.calledOnce).to.be.true;
    });
  });

  describe('パフォーマンス関連コマンド', () => {
    it('showPerformanceReportコマンドでパフォーマンスレポートが表示される', async () => {
      commandManager.registerCommands();

      const showPerformanceReportCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.showPerformanceReport').args[1];

      await showPerformanceReportCallback();

      expect(mockErrorHandler.executeSafely.calledOnce).to.be.true;
      expect(vscode.workspace.openTextDocument.calledOnce).to.be.true;
      expect(vscode.window.showTextDocument.calledOnce).to.be.true;
    });

    it('clearPerformanceMetricsコマンドでパフォーマンスメトリクスがクリアされる', async () => {
      commandManager.registerCommands();

      const clearPerformanceMetricsCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.clearPerformanceMetrics').args[1];

      await clearPerformanceMetricsCallback();

      expect(mockErrorHandler.executeSafely.calledOnce).to.be.true;
    });

    it('togglePerformanceMonitoringコマンドでパフォーマンス監視が切り替えられる', async () => {
      commandManager.registerCommands();

      const togglePerformanceMonitoringCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.togglePerformanceMonitoring').args[1];

      await togglePerformanceMonitoringCallback();

      expect(mockErrorHandler.executeSafely.calledOnce).to.be.true;
      expect(mockConfigManager.getPerformanceSettings.calledOnce).to.be.true;
      expect(mockConfigManager.set.calledOnce).to.be.true;
    });

    it('enablePerformanceMonitoringコマンドでパフォーマンス監視が有効化される', async () => {
      commandManager.registerCommands();

      const enablePerformanceMonitoringCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.enablePerformanceMonitoring').args[1];

      await enablePerformanceMonitoringCallback();

      expect(mockErrorHandler.executeSafely.calledOnce).to.be.true;
      expect(mockConfigManager.set.calledWith('performance.enablePerformanceLogs', true)).to.be.true;
    });

    it('generateSampleEventsコマンドでサンプルイベントが生成される', async () => {
      commandManager.registerCommands();

      const generateSampleEventsCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.generateSampleEvents').args[1];

      await generateSampleEventsCallback();

      expect(mockErrorHandler.executeSafely.calledOnce).to.be.true;
    });
  });

  describe('エラーハンドリング', () => {
    it('パフォーマンスレポート表示でエラーが発生した場合、適切に処理される', async () => {
      // ErrorHandler.executeSafelyがfalseを返すようにモック
      mockErrorHandler.executeSafely.returns(Promise.resolve(false));

      commandManager.registerCommands();

      const showPerformanceReportCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.showPerformanceReport').args[1];

      // エラーが発生しても例外が投げられないことを確認
      try {
        await showPerformanceReportCallback();
        expect(mockErrorHandler.executeSafely.calledOnce).to.be.true;
      } catch (error) {
        expect.fail(`エラーが発生すべきではありません: ${error.message}`);
      }
    });

    it('自動プレビュー設定チェックでエラーが発生した場合、適切に処理される', async () => {
      // ErrorHandler.executeSafelyがfalseを返すようにモック
      mockErrorHandler.executeSafely.returns(Promise.resolve(false));

      commandManager.registerCommands();

      const checkAutoPreviewCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.checkAutoPreviewSetting').args[1];

      // エラーが発生しても例外が投げられないことを確認
      try {
        await checkAutoPreviewCallback();
        expect(mockErrorHandler.executeSafely.calledOnce).to.be.true;
      } catch (error) {
        expect.fail(`エラーが発生すべきではありません: ${error.message}`);
      }
    });
  });

  describe('openPreviewWithCheck()', () => {
    it('openPreviewWithCheck()でwebViewManager.openPreview()が呼び出される', async () => {
      commandManager.registerCommands();

      // openPreviewコマンドを実行してopenPreviewWithCheck()をテスト
      const openPreviewCallback = vscode.commands.registerCommand.getCalls()
        .find(call => call.args[0] === 'textui-designer.openPreview').args[1];

      await openPreviewCallback();

      expect(mockWebViewManager.openPreview.calledOnce).to.be.true;
    });
  });
}); 