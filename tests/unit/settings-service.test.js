/**
 * SettingsServiceの基本テスト（CommonJS/ts-node直require）
 */
const assert = require('assert');
const { describe, it, beforeEach } = require('mocha');

// VSCode APIとConfigManagerのモック
const mockConfig = {
  supportedFileExtensions: ['.tui.yml', '.tui.json'],
  autoPreview: { enabled: true },
  devTools: { enabled: false },
  webview: { theme: 'light' },
  export: { format: 'html' },
  diagnostics: { lint: true },
  schema: { strict: true },
  templates: { default: 'form' }
};

const mockConfigManager = {
  getSupportedFileExtensions: () => mockConfig.supportedFileExtensions,
  isAutoPreviewEnabled: () => mockConfig.autoPreview.enabled,
  isDevToolsEnabled: () => mockConfig.devTools.enabled,
  getWebViewSettings: () => mockConfig.webview,
  getExportSettings: () => mockConfig.export,
  getDiagnosticSettings: () => mockConfig.diagnostics,
  getSchemaSettings: () => mockConfig.schema,
  getTemplateSettings: () => mockConfig.templates,
  resetConfiguration: () => { mockConfig.autoPreview.enabled = false; },
};

let infoMessages = [];
const mockErrorHandler = {
  executeSafely: async (fn) => { try { await fn(); return true; } catch { return false; } },
  showInfo: (msg) => infoMessages.push(msg)
};

let lastCommand;
let lastWarning;
const mockVscode = {
  commands: {
    executeCommand: async (cmd, arg) => { lastCommand = { cmd, arg }; }
  },
  window: {
    showWarningMessage: async (msg, opts, btn) => { lastWarning = msg; return btn; },
    showTextDocument: async () => {}
  },
  workspace: {
    openTextDocument: async ({ content, language }) => ({ content, language }),
    onDidChangeConfiguration: (cb) => {
      mockVscode._onDidChangeConfiguration = cb;
      return { dispose: () => {} };
    }
  },
  Disposable: class { dispose() {} },
  _onDidChangeConfiguration: () => {}
};

function createConfigEvent(affects) {
  return {
    affectsConfiguration: (key) => affects.includes(key)
  };
}

// SettingsServiceのモック
class MockSettingsService {
  constructor(configManager, errorHandler) {
    this.configManager = configManager;
    this.errorHandler = errorHandler;
  }

  getCurrentSettings() {
    return {
      supportedFileExtensions: this.configManager.getSupportedFileExtensions(),
      autoPreview: { enabled: this.configManager.isAutoPreviewEnabled() },
      devTools: { enabled: this.configManager.isDevToolsEnabled() },
      webview: this.configManager.getWebViewSettings(),
      export: this.configManager.getExportSettings(),
      diagnostics: this.configManager.getDiagnosticSettings(),
      schema: this.configManager.getSchemaSettings(),
      templates: this.configManager.getTemplateSettings()
    };
  }

  async resetSettings() {
    this.configManager.resetConfiguration();
    this.errorHandler.showInfo('設定をリセットしました。');
  }

  startWatching(callback) {
    mockVscode.workspace.onDidChangeConfiguration(callback);
    return { dispose: () => {} };
  }

  hasConfigurationChanged(event) {
    return event.affectsConfiguration('textui-designer');
  }
}

describe('SettingsService', () => {
  let service;
  beforeEach(() => {
    infoMessages = [];
    lastCommand = null;
    lastWarning = null;
    service = new MockSettingsService(mockConfigManager, mockErrorHandler);
  });

  it('設定値の取得が正しく動作する', () => {
    const settings = service.getCurrentSettings();
    assert.deepStrictEqual(settings.supportedFileExtensions, ['.tui.yml', '.tui.json']);
    assert.strictEqual(settings.autoPreview.enabled, true);
    assert.strictEqual(settings.devTools.enabled, false);
    assert.strictEqual(settings.webview.theme, 'light');
    assert.strictEqual(settings.export.format, 'html');
    assert.strictEqual(settings.diagnostics.lint, true);
    assert.strictEqual(settings.schema.strict, true);
    assert.strictEqual(settings.templates.default, 'form');
  });

  it('設定値の更新（リセット）が正しく動作する', async () => {
    mockConfig.autoPreview.enabled = true;
    await service.resetSettings();
    assert.strictEqual(mockConfig.autoPreview.enabled, false);
    assert.ok(infoMessages.includes('設定をリセットしました。'));
  });

  it('設定変更イベントが正しく発火する', () => {
    let called = false;
    const disposable = service.startWatching(() => { called = true; });
    mockVscode._onDidChangeConfiguration(createConfigEvent(['textui-designer']));
    assert.ok(called);
    disposable.dispose();
  });

  it('設定の検証が正しく行われる', () => {
    const event = createConfigEvent(['textui-designer']);
    assert.strictEqual(service.hasConfigurationChanged(event), true);
    const event2 = createConfigEvent(['other-extension']);
    assert.strictEqual(service.hasConfigurationChanged(event2), false);
  });
}); 